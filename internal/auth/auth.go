package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	sessionCookie = "budget_session"
	loginCookie   = "budget_login"

	sessionLife = 90 * 24 * time.Hour
	// renewBelow: a session with less time left than this gets a fresh
	// cookie, so an account in use never gets signed out, without writing a
	// cookie on every request.
	renewBelow = 80 * 24 * time.Hour
	loginLife  = 10 * time.Minute

	// Purposes keep the two signed cookies apart.
	purposeSession = "session"
	purposeLogin   = "login"
)

// Config is what Auth needs. Exactly one of Issuer and DevAccount is set.
type Config struct {
	Issuer, ClientID, ClientSecret string       // OIDC; Issuer empty means development mode
	BaseURL                        string       // public URL, e.g. https://budget.example; redirect URI = BaseURL + "/auth/callback"
	Secret                         []byte       // >= 32 bytes, HMAC key for cookies
	DevAccount                     string       // development login account; only when Issuer is empty
	HTTPClient                     *http.Client // optional, for tests
}

// Auth runs the login routes and reads sessions from requests.
type Auth struct {
	secret      []byte
	secure      bool
	redirectURI string
	devAccount  string
	oidc        *provider // nil in development mode
	now         func() time.Time
}

// New checks c and, when an issuer is set, fetches its discovery document.
func New(ctx context.Context, c Config) (*Auth, error) {
	if (c.Issuer == "") == (c.DevAccount == "") {
		return nil, errors.New("auth: set exactly one of issuer and development account")
	}
	if len(c.Secret) < 32 {
		return nil, errors.New("auth: secret shorter than 32 bytes")
	}
	base, err := url.Parse(c.BaseURL)
	if err != nil || (base.Scheme != "http" && base.Scheme != "https") || base.Host == "" {
		return nil, fmt.Errorf("auth: base URL %q is not an http(s) URL", c.BaseURL)
	}
	a := &Auth{
		secret:      c.Secret,
		secure:      base.Scheme == "https",
		redirectURI: strings.TrimSuffix(c.BaseURL, "/") + "/auth/callback",
		devAccount:  c.DevAccount,
		now:         time.Now,
	}
	if c.Issuer == "" {
		return a, nil
	}
	if c.ClientID == "" || c.ClientSecret == "" {
		return nil, errors.New("auth: client id and client secret are required with an issuer")
	}
	client := c.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	a.oidc, err = discover(ctx, client, c.Issuer, c.ClientID, c.ClientSecret)
	if err != nil {
		return nil, err
	}
	return a, nil
}

// Register mounts GET /auth/login, GET /auth/callback and POST /auth/logout.
func (a *Auth) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /auth/login", a.login)
	mux.HandleFunc("GET /auth/callback", a.callback)
	mux.HandleFunc("POST /auth/logout", a.logout)
}

type session struct {
	Account string `json:"a"`
	Expiry  int64  `json:"e"` // unix seconds
}

// Account returns the account of a valid session. When w is not nil and the
// session has less than 80 of its 90 days left, it renews the cookie.
func (a *Auth) Account(w http.ResponseWriter, r *http.Request) (string, bool) {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return "", false
	}
	var s session
	if open(a.secret, purposeSession, c.Value, &s) != nil || s.Account == "" {
		return "", false
	}
	now := a.now()
	left := time.Unix(s.Expiry, 0).Sub(now)
	if left <= 0 {
		return "", false
	}
	if w != nil && left < renewBelow {
		a.setSession(w, s.Account)
	}
	return s.Account, true
}

func (a *Auth) setSession(w http.ResponseWriter, account string) {
	v, err := seal(a.secret, purposeSession, session{account, a.now().Add(sessionLife).Unix()})
	if err != nil {
		panic(err) // marshalling a struct of a string and an int cannot fail
	}
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: v, Path: "/", MaxAge: int(sessionLife.Seconds()),
		HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode,
	})
}

type pending struct {
	State    string `json:"s"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
	Expiry   int64  `json:"e"` // unix seconds
}

func (a *Auth) login(w http.ResponseWriter, r *http.Request) {
	if a.oidc == nil {
		a.setSession(w, a.devAccount)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}
	p := pending{
		State:    random(),
		Nonce:    random(),
		Verifier: random(),
		Expiry:   a.now().Add(loginLife).Unix(),
	}
	v, err := seal(a.secret, purposeLogin, p)
	if err != nil {
		panic(err) // marshalling a struct of strings and an int cannot fail
	}
	http.SetCookie(w, &http.Cookie{
		Name: loginCookie, Value: v, Path: "/auth", MaxAge: int(loginLife.Seconds()),
		HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode,
	})
	challenge := sha256.Sum256([]byte(p.Verifier))
	q := url.Values{
		"response_type":         {"code"},
		"client_id":             {a.oidc.clientID},
		"redirect_uri":          {a.redirectURI},
		"scope":                 {"openid profile"},
		"state":                 {p.State},
		"nonce":                 {p.Nonce},
		"code_challenge":        {b64.EncodeToString(challenge[:])},
		"code_challenge_method": {"S256"},
	}
	target := a.oidc.authURL
	if strings.Contains(target, "?") {
		target += "&" + q.Encode()
	} else {
		target += "?" + q.Encode()
	}
	http.Redirect(w, r, target, http.StatusFound)
}

func (a *Auth) callback(w http.ResponseWriter, r *http.Request) {
	if a.oidc == nil {
		http.NotFound(w, r)
		return
	}
	// The login cookie is single use, whatever the outcome.
	http.SetCookie(w, &http.Cookie{
		Name: loginCookie, Path: "/auth", MaxAge: -1,
		HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode,
	})
	q := r.URL.Query()
	if e := q.Get("error"); e != "" {
		slog.Warn("auth: provider refused login", "error", e)
		failPage(w, http.StatusBadRequest)
		return
	}
	var p pending
	c, err := r.Cookie(loginCookie)
	if err != nil || open(a.secret, purposeLogin, c.Value, &p) != nil || a.now().Unix() > p.Expiry {
		slog.Warn("auth: callback without a valid login cookie")
		failPage(w, http.StatusBadRequest)
		return
	}
	if subtle.ConstantTimeCompare([]byte(q.Get("state")), []byte(p.State)) != 1 {
		slog.Warn("auth: callback state mismatch")
		failPage(w, http.StatusBadRequest)
		return
	}
	code := q.Get("code")
	if code == "" {
		slog.Warn("auth: callback without code")
		failPage(w, http.StatusBadRequest)
		return
	}
	token, err := a.oidc.exchange(r.Context(), code, p.Verifier, a.redirectURI)
	if err != nil {
		slog.Error("auth: code exchange failed", "err", err)
		failPage(w, http.StatusBadGateway)
		return
	}
	account, err := a.oidc.verify(r.Context(), token, p.Nonce, a.now())
	if err != nil {
		slog.Error("auth: id_token rejected", "err", err)
		failPage(w, http.StatusBadGateway)
		return
	}
	a.setSession(w, account)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (a *Auth) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

// failPage tells the person the login did not work and offers a new try.
// It says nothing about why; the reason goes to the log.
func failPage(w http.ResponseWriter, status int) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	fmt.Fprint(w, `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anmeldung / Sign-in</title></head>
<body>
<p lang="de">Die Anmeldung hat nicht geklappt. <a href="/auth/login">Erneut anmelden</a></p>
<p lang="en">Sign-in did not work. <a href="/auth/login">Sign in again</a></p>
</body></html>
`)
}

// random returns 32 random bytes, base64url encoded.
func random() string {
	b := make([]byte, 32)
	rand.Read(b) // never returns an error
	return b64.EncodeToString(b)
}
