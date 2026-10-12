package auth

import (
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeOP is an OpenID provider on httptest: discovery, token endpoint and
// JWKS. The authorize step is skipped; tests call the callback directly.
type fakeOP struct {
	srv    *httptest.Server
	issuer string // what discovery claims; defaults to the server URL

	mu         sync.Mutex
	keys       map[string]*rsa.PrivateKey // published in JWKS; guarded by mu
	idToken    string                     // next token endpoint answer; guarded by mu
	lastForm   url.Values                 // last token request body; guarded by mu
	lastBasic  [2]string                  // last basic auth user and password; guarded by mu
	jwksHits   int                        // guarded by mu
	authMethod []string                   // token_endpoint_auth_methods_supported
}

const (
	testClientID     = "budget"
	testClientSecret = "client-secret-for-tests"
)

var testSecret = []byte("0123456789abcdef0123456789abcdef")

// testNow is the fixed clock of every test Auth.
var testNow = time.Date(2026, 10, 12, 12, 0, 0, 0, time.UTC)

func newOP(t *testing.T) *fakeOP {
	t.Helper()
	op := &fakeOP{keys: map[string]*rsa.PrivateKey{"k1": newKey(t)}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /.well-known/openid-configuration", op.discovery)
	mux.HandleFunc("POST /token", op.token)
	mux.HandleFunc("GET /jwks", op.jwks)
	op.srv = httptest.NewServer(mux)
	t.Cleanup(op.srv.Close)
	op.issuer = op.srv.URL
	return op
}

func newKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func (op *fakeOP) discovery(w http.ResponseWriter, r *http.Request) {
	d := map[string]any{
		"issuer":                 op.issuer,
		"authorization_endpoint": op.srv.URL + "/authorize",
		"token_endpoint":         op.srv.URL + "/token",
		"jwks_uri":               op.srv.URL + "/jwks",
	}
	if op.authMethod != nil {
		d["token_endpoint_auth_methods_supported"] = op.authMethod
	}
	json.NewEncoder(w).Encode(d)
}

func (op *fakeOP) token(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	u, p, _ := r.BasicAuth()
	op.mu.Lock()
	defer op.mu.Unlock()
	op.lastForm = r.PostForm
	op.lastBasic = [2]string{u, p}
	json.NewEncoder(w).Encode(map[string]string{"id_token": op.idToken, "access_token": "at", "token_type": "Bearer"})
}

func (op *fakeOP) jwks(w http.ResponseWriter, r *http.Request) {
	op.mu.Lock()
	defer op.mu.Unlock()
	op.jwksHits++
	var keys []map[string]string
	for kid, k := range op.keys {
		keys = append(keys, map[string]string{
			"kty": "RSA", "use": "sig", "alg": "RS256", "kid": kid,
			"n": b64.EncodeToString(k.N.Bytes()),
			"e": b64.EncodeToString(big.NewInt(int64(k.E)).Bytes()),
		})
	}
	json.NewEncoder(w).Encode(map[string]any{"keys": keys})
}

// setToken makes the token endpoint answer with this id_token next.
func (op *fakeOP) setToken(tok string) {
	op.mu.Lock()
	defer op.mu.Unlock()
	op.idToken = tok
}

// rotate replaces the published keys with one new key under kid.
func (op *fakeOP) rotate(t *testing.T, kid string) *rsa.PrivateKey {
	k := newKey(t)
	op.mu.Lock()
	defer op.mu.Unlock()
	op.keys = map[string]*rsa.PrivateKey{kid: k}
	return k
}

func (op *fakeOP) key(kid string) *rsa.PrivateKey {
	op.mu.Lock()
	defer op.mu.Unlock()
	return op.keys[kid]
}

// claimsFor are valid claims for nonce at testNow.
func (op *fakeOP) claimsFor(nonce string) map[string]any {
	return map[string]any{
		"iss": op.issuer, "sub": "danilo", "aud": testClientID,
		"exp": testNow.Add(5 * time.Minute).Unix(), "iat": testNow.Unix(), "nonce": nonce,
	}
}

func signRS256(t *testing.T, key *rsa.PrivateKey, kid string, claims map[string]any) string {
	t.Helper()
	signed := segment(t, map[string]string{"alg": "RS256", "kid": kid, "typ": "JWT"}) + "." + segment(t, claims)
	sum := sha256.Sum256([]byte(signed))
	sig, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
	if err != nil {
		t.Fatal(err)
	}
	return signed + "." + b64.EncodeToString(sig)
}

func signHS256(t *testing.T, secret string, claims map[string]any) string {
	t.Helper()
	signed := segment(t, map[string]string{"alg": "HS256", "typ": "JWT"}) + "." + segment(t, claims)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(signed))
	return signed + "." + b64.EncodeToString(h.Sum(nil))
}

func segment(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return b64.EncodeToString(b)
}

func newOIDCAuth(t *testing.T, op *fakeOP) *Auth {
	t.Helper()
	a, err := New(context.Background(), Config{
		Issuer: op.srv.URL, ClientID: testClientID, ClientSecret: testClientSecret,
		BaseURL: "https://budget.example", Secret: testSecret, HTTPClient: op.srv.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	a.now = func() time.Time { return testNow }
	return a
}

// serve sends one request through a mux with a's routes.
func serve(a *Auth, method, target string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	mux := http.NewServeMux()
	a.Register(mux)
	r := httptest.NewRequest(method, target, nil)
	for _, c := range cookies {
		r.AddCookie(c)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	return w
}

// startLogin runs /auth/login and returns the login cookie, what it holds,
// and the redirect target.
func startLogin(t *testing.T, a *Auth) (*http.Cookie, pending, *url.URL) {
	t.Helper()
	w := serve(a, "GET", "/auth/login")
	if w.Code != http.StatusFound {
		t.Fatalf("login status %d", w.Code)
	}
	c := cookieNamed(t, w, loginCookie)
	var p pending
	if err := open(testSecret, purposeLogin, c.Value, &p); err != nil {
		t.Fatal(err)
	}
	loc, err := url.Parse(w.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	return c, p, loc
}

func callback(a *Auth, query url.Values, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	return serve(a, "GET", "/auth/callback?"+query.Encode(), cookies...)
}

func cookieNamed(t *testing.T, w *httptest.ResponseRecorder, name string) *http.Cookie {
	t.Helper()
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	t.Fatalf("no cookie %s in %q", name, w.Header().Values("Set-Cookie"))
	return nil
}

func hasCookie(w *httptest.ResponseRecorder, name string) bool {
	for _, c := range w.Result().Cookies() {
		if c.Name == name && c.MaxAge >= 0 {
			return true
		}
	}
	return false
}

// accountOf reads the session the response set.
func accountOf(t *testing.T, a *Auth, w *httptest.ResponseRecorder) (string, bool) {
	t.Helper()
	if !hasCookie(w, sessionCookie) {
		return "", false
	}
	r := httptest.NewRequest("GET", "/", nil)
	r.AddCookie(cookieNamed(t, w, sessionCookie))
	return a.Account(nil, r)
}

func mustContain(t *testing.T, s, sub string) {
	t.Helper()
	if !strings.Contains(s, sub) {
		t.Fatalf("%q does not contain %q", s, sub)
	}
}

// last returns the last token request: its body and basic auth user and password.
func (op *fakeOP) last() (url.Values, [2]string) {
	op.mu.Lock()
	defer op.mu.Unlock()
	return op.lastForm, op.lastBasic
}

func (op *fakeOP) hits() int {
	op.mu.Lock()
	defer op.mu.Unlock()
	return op.jwksHits
}
