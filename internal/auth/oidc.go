package auth

import (
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"
)

// errToken covers every id_token that fails verification.
var errToken = errors.New("auth: invalid id_token")

const (
	// leeway absorbs clock drift between this server and the provider.
	leeway = 2 * time.Minute
	// maxBody caps what is read from the provider.
	maxBody = 1 << 20
)

// provider is the OpenID Connect provider as described by its discovery
// document, plus a cache of its signing keys.
type provider struct {
	client       *http.Client
	issuer       string
	clientID     string
	clientSecret string
	authURL      string
	tokenURL     string
	jwksURL      string
	postAuth     bool // send client credentials in the body (client_secret_post)

	mu   sync.Mutex
	keys map[string]*rsa.PublicKey // guarded by mu; nil until first fetch
}

type discovery struct {
	Issuer           string   `json:"issuer"`
	AuthEndpoint     string   `json:"authorization_endpoint"`
	TokenEndpoint    string   `json:"token_endpoint"`
	JWKSURI          string   `json:"jwks_uri"`
	TokenAuthMethods []string `json:"token_endpoint_auth_methods_supported"`
}

// discover fetches the discovery document of issuer. Redirects are followed,
// as Nextcloud answers the well-known URL with one.
func discover(ctx context.Context, client *http.Client, issuer, clientID, clientSecret string) (*provider, error) {
	u := strings.TrimSuffix(issuer, "/") + "/.well-known/openid-configuration"
	var d discovery
	if err := getJSON(ctx, client, u, &d); err != nil {
		return nil, fmt.Errorf("auth: discovery: %w", err)
	}
	if d.Issuer != issuer {
		return nil, fmt.Errorf("auth: discovery: issuer %q, want %q", d.Issuer, issuer)
	}
	if d.AuthEndpoint == "" || d.TokenEndpoint == "" || d.JWKSURI == "" {
		return nil, errors.New("auth: discovery: missing authorization_endpoint, token_endpoint or jwks_uri")
	}
	m := d.TokenAuthMethods
	post := len(m) > 0 && !slices.Contains(m, "client_secret_basic") && slices.Contains(m, "client_secret_post")
	return &provider{
		client:       client,
		issuer:       issuer,
		clientID:     clientID,
		clientSecret: clientSecret,
		authURL:      d.AuthEndpoint,
		tokenURL:     d.TokenEndpoint,
		jwksURL:      d.JWKSURI,
		postAuth:     post,
	}, nil
}

func getJSON(ctx context.Context, client *http.Client, u string, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: status %d", u, resp.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxBody)).Decode(v); err != nil {
		return fmt.Errorf("GET %s: %w", u, err)
	}
	return nil
}

// exchange trades an authorization code for an id_token at the token
// endpoint.
func (p *provider) exchange(ctx context.Context, code, verifier, redirectURI string) (string, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"code_verifier": {verifier},
	}
	if p.postAuth {
		form.Set("client_id", p.clientID)
		form.Set("client_secret", p.clientSecret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	if !p.postAuth {
		// RFC 6749 section 2.3.1: both parts are form-encoded first.
		req.SetBasicAuth(url.QueryEscape(p.clientID), url.QueryEscape(p.clientSecret))
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("auth: token endpoint: %w", err)
	}
	defer resp.Body.Close()
	var body struct {
		IDToken string `json:"id_token"`
		Error   string `json:"error"`
	}
	// The body holds tokens; only its error code may reach an error message.
	_ = json.NewDecoder(io.LimitReader(resp.Body, maxBody)).Decode(&body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("auth: token endpoint: status %d %s", resp.StatusCode, body.Error)
	}
	if body.IDToken == "" {
		return "", errors.New("auth: token endpoint: no id_token")
	}
	return body.IDToken, nil
}

type claims struct {
	Issuer   string   `json:"iss"`
	Subject  string   `json:"sub"`
	Audience audience `json:"aud"`
	AZP      string   `json:"azp"`
	Expiry   float64  `json:"exp"`
	IssuedAt float64  `json:"iat"`
	Nonce    string   `json:"nonce"`
}

// audience is the aud claim, which is either one string or a list.
type audience []string

func (a *audience) UnmarshalJSON(b []byte) error {
	var one string
	if err := json.Unmarshal(b, &one); err == nil {
		*a = audience{one}
		return nil
	}
	var many []string
	if err := json.Unmarshal(b, &many); err != nil {
		return err
	}
	*a = many
	return nil
}

// verify checks the signature and claims of an id_token and returns its
// subject.
func (p *provider) verify(ctx context.Context, token, nonce string, now time.Time) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", fmt.Errorf("%w: not a JWS", errToken)
	}
	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := decodeSegment(parts[0], &header); err != nil {
		return "", fmt.Errorf("%w: header: %v", errToken, err)
	}
	sig, err := b64.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("%w: signature encoding", errToken)
	}
	signed := []byte(parts[0] + "." + parts[1])
	switch header.Alg {
	case "RS256":
		key, err := p.key(ctx, header.Kid)
		if err != nil {
			return "", err
		}
		sum := sha256.Sum256(signed)
		if rsa.VerifyPKCS1v15(key, crypto.SHA256, sum[:], sig) != nil {
			return "", fmt.Errorf("%w: bad signature", errToken)
		}
	case "HS256":
		h := hmac.New(sha256.New, []byte(p.clientSecret))
		h.Write(signed)
		if !hmac.Equal(sig, h.Sum(nil)) {
			return "", fmt.Errorf("%w: bad signature", errToken)
		}
	default:
		return "", fmt.Errorf("%w: alg %q", errToken, header.Alg)
	}

	var c claims
	if err := decodeSegment(parts[1], &c); err != nil {
		return "", fmt.Errorf("%w: claims: %v", errToken, err)
	}
	switch {
	case c.Issuer != p.issuer:
		return "", fmt.Errorf("%w: iss %q", errToken, c.Issuer)
	case !slices.Contains(c.Audience, p.clientID):
		return "", fmt.Errorf("%w: aud %q", errToken, []string(c.Audience))
	case len(c.Audience) > 1 && c.AZP != p.clientID:
		return "", fmt.Errorf("%w: azp %q", errToken, c.AZP)
	case c.Expiry == 0 || now.After(time.Unix(int64(c.Expiry), 0).Add(leeway)):
		return "", fmt.Errorf("%w: expired", errToken)
	case time.Unix(int64(c.IssuedAt), 0).After(now.Add(leeway)):
		return "", fmt.Errorf("%w: iat in the future", errToken)
	case !hmac.Equal([]byte(c.Nonce), []byte(nonce)):
		return "", fmt.Errorf("%w: nonce mismatch", errToken)
	case c.Subject == "":
		return "", fmt.Errorf("%w: no sub", errToken)
	}
	return c.Subject, nil
}

func decodeSegment(s string, v any) error {
	b, err := b64.DecodeString(s)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

// key returns the signing key with this kid. On a miss it refetches the key
// set once, so a key rotation at the provider needs no restart.
func (p *provider) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if k := pick(p.keys, kid); k != nil {
		return k, nil
	}
	keys, err := p.fetchKeys(ctx)
	if err != nil {
		return nil, err
	}
	p.keys = keys
	if k := pick(keys, kid); k != nil {
		return k, nil
	}
	return nil, fmt.Errorf("%w: unknown kid %q", errToken, kid)
}

// pick finds the key for kid; a token without kid matches a lone key.
func pick(keys map[string]*rsa.PublicKey, kid string) *rsa.PublicKey {
	if kid == "" && len(keys) == 1 {
		for _, k := range keys {
			return k
		}
	}
	return keys[kid]
}

func (p *provider) fetchKeys(ctx context.Context) (map[string]*rsa.PublicKey, error) {
	var set struct {
		Keys []struct {
			Kty string `json:"kty"`
			Use string `json:"use"`
			Kid string `json:"kid"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := getJSON(ctx, p.client, p.jwksURL, &set); err != nil {
		return nil, fmt.Errorf("auth: jwks: %w", err)
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range set.Keys {
		if k.Kty != "RSA" || (k.Use != "" && k.Use != "sig") {
			continue
		}
		n, err1 := b64.DecodeString(k.N)
		e, err2 := b64.DecodeString(k.E)
		if err1 != nil || err2 != nil || len(e) == 0 || len(e) > 4 {
			continue
		}
		pub := &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
		if pub.N.BitLen() < 2048 {
			continue
		}
		keys[k.Kid] = pub
	}
	return keys, nil
}
