package auth

import (
	"context"
	"crypto/sha256"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestLoginRedirectsToProviderWithPKCE(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, loc := startLogin(t, a)

	if got := loc.Scheme + "://" + loc.Host + loc.Path; got != op.srv.URL+"/authorize" {
		t.Errorf("redirect to %s", got)
	}
	q := loc.Query()
	sum := sha256.Sum256([]byte(p.Verifier))
	want := map[string]string{
		"response_type":         "code",
		"client_id":             testClientID,
		"redirect_uri":          "https://budget.example/auth/callback",
		"scope":                 "openid profile",
		"state":                 p.State,
		"nonce":                 p.Nonce,
		"code_challenge":        b64.EncodeToString(sum[:]),
		"code_challenge_method": "S256",
	}
	for k, v := range want {
		if q.Get(k) != v {
			t.Errorf("%s = %q, want %q", k, q.Get(k), v)
		}
	}
	if p.State == "" || p.Nonce == "" || p.Verifier == "" || p.State == p.Nonce {
		t.Errorf("weak login values %+v", p)
	}
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.Path != "/auth" || c.MaxAge != 600 {
		t.Errorf("login cookie attributes %+v", c)
	}
}

func TestCallbackSignsIn(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))

	w := callback(a, url.Values{"code": {"the-code"}, "state": {p.State}}, c)

	if w.Code != http.StatusFound || w.Header().Get("Location") != "/" {
		t.Fatalf("status %d location %q body %s", w.Code, w.Header().Get("Location"), w.Body)
	}
	if acc, ok := accountOf(t, a, w); !ok || acc != "danilo" {
		t.Fatalf("account %q %v", acc, ok)
	}
	s := cookieNamed(t, w, sessionCookie)
	if !s.HttpOnly || !s.Secure || s.SameSite != http.SameSiteLaxMode || s.Path != "/" || s.MaxAge != 90*24*3600 {
		t.Errorf("session cookie attributes %+v", s)
	}
	if l := cookieNamed(t, w, loginCookie); l.MaxAge >= 0 {
		t.Errorf("login cookie not cleared: %+v", l)
	}
	f, basic := op.last()
	if f.Get("grant_type") != "authorization_code" || f.Get("code") != "the-code" ||
		f.Get("code_verifier") != p.Verifier || f.Get("redirect_uri") != "https://budget.example/auth/callback" {
		t.Errorf("token request %v", f)
	}
	if basic != [2]string{testClientID, testClientSecret} || f.Has("client_secret") {
		t.Errorf("want client_secret_basic, got basic %q form %v", basic, f)
	}
}

func TestCallbackUsesClientSecretPostWhenOnlyOffered(t *testing.T) {
	op := newOP(t)
	op.authMethod = []string{"client_secret_post"}
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))

	w := callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c)

	if _, ok := accountOf(t, a, w); !ok {
		t.Fatalf("not signed in: %d %s", w.Code, w.Body)
	}
	f, basic := op.last()
	if basic != [2]string{} || f.Get("client_id") != testClientID || f.Get("client_secret") != testClientSecret {
		t.Errorf("want client_secret_post, got basic %q form %v", basic, f)
	}
}

func TestCallbackRejectsWrongState(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))

	w := callback(a, url.Values{"code": {"x"}, "state": {"other"}}, c)

	assertFailed(t, a, w)
	if f, _ := op.last(); f != nil {
		t.Error("code was exchanged despite wrong state")
	}
}

func TestCallbackRejectsMissingLoginCookie(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	_, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))

	assertFailed(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}))
}

func TestCallbackRejectsExpiredLoginCookie(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))
	a.now = func() time.Time { return testNow.Add(11 * time.Minute) }

	assertFailed(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c))
}

func TestCallbackShowsProviderError(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)

	w := callback(a, url.Values{"error": {"access_denied"}, "state": {p.State}}, c)

	assertFailed(t, a, w)
	mustContain(t, w.Body.String(), `href="/auth/login"`)
	mustContain(t, w.Body.String(), "Anmeldung")
	mustContain(t, w.Body.String(), "Sign-in")
}

// Each case changes one thing about an otherwise valid id_token.
func TestCallbackRejectsBadIDToken(t *testing.T) {
	cases := map[string]func(t *testing.T, op *fakeOP, claims map[string]any) string{
		"nonce mismatch": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["nonce"] = "other"
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"wrong audience": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["aud"] = "someone-else"
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"multiple audiences without azp": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["aud"] = []string{testClientID, "other"}
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"wrong issuer": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["iss"] = "https://evil.example"
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"expired": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["exp"] = testNow.Add(-10 * time.Minute).Unix()
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"issued in the future": func(t *testing.T, op *fakeOP, c map[string]any) string {
			c["iat"] = testNow.Add(time.Hour).Unix()
			return signRS256(t, op.key("k1"), "k1", c)
		},
		"bad signature": func(t *testing.T, op *fakeOP, c map[string]any) string {
			return signRS256(t, newKey(t), "k1", c)
		},
		"HS256 with wrong secret": func(t *testing.T, op *fakeOP, c map[string]any) string {
			return signHS256(t, "not-the-client-secret", c)
		},
		"alg none": func(t *testing.T, op *fakeOP, c map[string]any) string {
			return segment(t, map[string]string{"alg": "none"}) + "." + segment(t, c) + "."
		},
	}
	for name, makeToken := range cases {
		t.Run(name, func(t *testing.T) {
			op := newOP(t)
			a := newOIDCAuth(t, op)
			c, p, _ := startLogin(t, a)
			op.setToken(makeToken(t, op, op.claimsFor(p.Nonce)))

			assertFailed(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c))
		})
	}
}

func TestCallbackAcceptsMultipleAudiencesWithAZP(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	claims := op.claimsFor(p.Nonce)
	claims["aud"] = []string{"other", testClientID}
	claims["azp"] = testClientID
	op.setToken(signRS256(t, op.key("k1"), "k1", claims))

	if _, ok := accountOf(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c)); !ok {
		t.Fatal("not signed in")
	}
}

func TestCallbackAcceptsHS256(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, p, _ := startLogin(t, a)
	op.setToken(signHS256(t, testClientSecret, op.claimsFor(p.Nonce)))

	if acc, ok := accountOf(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c)); !ok || acc != "danilo" {
		t.Fatalf("account %q %v", acc, ok)
	}
}

func TestCallbackRefetchesKeysAfterRotation(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)

	// First login caches k1.
	c, p, _ := startLogin(t, a)
	op.setToken(signRS256(t, op.key("k1"), "k1", op.claimsFor(p.Nonce)))
	if _, ok := accountOf(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c)); !ok {
		t.Fatal("first login failed")
	}

	// The provider rotates to k2; the unknown kid triggers one refetch.
	k2 := op.rotate(t, "k2")
	c, p, _ = startLogin(t, a)
	op.setToken(signRS256(t, k2, "k2", op.claimsFor(p.Nonce)))
	if _, ok := accountOf(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c)); !ok {
		t.Fatal("login after rotation failed")
	}

	// A kid the provider never published fails after exactly one more fetch.
	c, p, _ = startLogin(t, a)
	op.setToken(signRS256(t, k2, "k3", op.claimsFor(p.Nonce)))
	assertFailed(t, a, callback(a, url.Values{"code": {"x"}, "state": {p.State}}, c))
	if n := op.hits(); n != 3 {
		t.Errorf("JWKS fetched %d times, want 3", n)
	}
}

func TestSessionRejectsTamperedCookie(t *testing.T) {
	a := newDevAuth(t)
	s := cookieNamed(t, serve(a, "GET", "/auth/login"), sessionCookie)

	payload, sig, _ := strings.Cut(s.Value, ".")
	forged := b64.EncodeToString([]byte(`{"a":"admin","e":9999999999}`)) + "." + sig
	flipped := payload + "." + flip(sig)
	for _, v := range []string{forged, flipped, payload, "", "x.y"} {
		r := httptest.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{Name: sessionCookie, Value: v})
		if acc, ok := a.Account(nil, r); ok {
			t.Errorf("cookie %q accepted as %q", v, acc)
		}
	}
}

func TestSessionRejectsLoginCookieValue(t *testing.T) {
	op := newOP(t)
	a := newOIDCAuth(t, op)
	c, _, _ := startLogin(t, a)
	r := httptest.NewRequest("GET", "/", nil)
	r.AddCookie(&http.Cookie{Name: sessionCookie, Value: c.Value})
	if _, ok := a.Account(nil, r); ok {
		t.Fatal("login cookie accepted as session")
	}
}

func TestSessionExpires(t *testing.T) {
	a := newDevAuth(t)
	s := cookieNamed(t, serve(a, "GET", "/auth/login"), sessionCookie)
	a.now = func() time.Time { return testNow.Add(90*24*time.Hour + time.Second) }

	r := httptest.NewRequest("GET", "/", nil)
	r.AddCookie(s)
	if _, ok := a.Account(httptest.NewRecorder(), r); ok {
		t.Fatal("expired session accepted")
	}
}

func TestSessionRenewsAfterTenDays(t *testing.T) {
	a := newDevAuth(t)
	s := cookieNamed(t, serve(a, "GET", "/auth/login"), sessionCookie)
	r := httptest.NewRequest("GET", "/", nil)
	r.AddCookie(s)

	// Nine days in: still more than 80 days left, no new cookie.
	a.now = func() time.Time { return testNow.Add(9 * 24 * time.Hour) }
	w := httptest.NewRecorder()
	if _, ok := a.Account(w, r); !ok || hasCookie(w, sessionCookie) {
		t.Fatalf("ok %v, renewed %v", ok, hasCookie(w, sessionCookie))
	}

	// Eleven days in: renewed to 90 days from now.
	later := testNow.Add(11 * 24 * time.Hour)
	a.now = func() time.Time { return later }
	w = httptest.NewRecorder()
	if _, ok := a.Account(w, r); !ok {
		t.Fatal("session rejected")
	}
	var got session
	if err := open(testSecret, purposeSession, cookieNamed(t, w, sessionCookie).Value, &got); err != nil {
		t.Fatal(err)
	}
	if got.Expiry != later.Add(90*24*time.Hour).Unix() || got.Account != "dev" {
		t.Errorf("renewed session %+v", got)
	}

	// Without a writer nothing is renewed and nothing panics.
	if _, ok := a.Account(nil, r); !ok {
		t.Fatal("session rejected with nil writer")
	}
}

func TestLogoutClearsSession(t *testing.T) {
	a := newDevAuth(t)
	s := cookieNamed(t, serve(a, "GET", "/auth/login"), sessionCookie)
	w := serve(a, "POST", "/auth/logout", s)
	if w.Code != http.StatusNoContent {
		t.Fatalf("status %d", w.Code)
	}
	if c := cookieNamed(t, w, sessionCookie); c.MaxAge >= 0 || c.Value != "" {
		t.Errorf("session cookie not cleared: %+v", c)
	}
	if serve(a, "GET", "/auth/logout").Code != http.StatusMethodNotAllowed {
		t.Error("GET logout allowed")
	}
}

func TestDevLoginSignsInDevAccount(t *testing.T) {
	a := newDevAuth(t)
	w := serve(a, "GET", "/auth/login")
	if w.Code != http.StatusFound || w.Header().Get("Location") != "/" {
		t.Fatalf("status %d location %q", w.Code, w.Header().Get("Location"))
	}
	if acc, ok := accountOf(t, a, w); !ok || acc != "dev" {
		t.Fatalf("account %q %v", acc, ok)
	}
	if cookieNamed(t, w, sessionCookie).Secure {
		t.Error("Secure cookie on http base URL")
	}
	if serve(a, "GET", "/auth/callback?code=x").Code != http.StatusNotFound {
		t.Error("callback answers in development mode")
	}
}

func newDevAuth(t *testing.T) *Auth {
	t.Helper()
	a, err := New(context.Background(), Config{BaseURL: "http://localhost:4000", Secret: testSecret, DevAccount: "dev"})
	if err != nil {
		t.Fatal(err)
	}
	a.now = func() time.Time { return testNow }
	return a
}

func TestNewRejectsBadConfig(t *testing.T) {
	op := newOP(t)
	good := Config{Issuer: op.srv.URL, ClientID: testClientID, ClientSecret: testClientSecret,
		BaseURL: "https://budget.example", Secret: testSecret, HTTPClient: op.srv.Client()}
	cases := map[string]func(c *Config){
		"neither issuer nor dev account": func(c *Config) { c.Issuer = "" },
		"both issuer and dev account":    func(c *Config) { c.DevAccount = "dev" },
		"short secret":                   func(c *Config) { c.Secret = testSecret[:31] },
		"no base URL":                    func(c *Config) { c.BaseURL = "" },
		"no client id":                   func(c *Config) { c.ClientID = "" },
		"no client secret":               func(c *Config) { c.ClientSecret = "" },
		"unreachable issuer":             func(c *Config) { c.Issuer = op.srv.URL + "/nothing" },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			c := good
			change(&c)
			if _, err := New(context.Background(), c); err == nil {
				t.Fatal("no error")
			}
		})
	}
	if _, err := New(context.Background(), good); err != nil {
		t.Fatalf("good config: %v", err)
	}
}

func TestNewRejectsIssuerMismatch(t *testing.T) {
	op := newOP(t)
	op.issuer = "https://elsewhere.example"
	_, err := New(context.Background(), Config{Issuer: op.srv.URL, ClientID: testClientID, ClientSecret: testClientSecret,
		BaseURL: "https://budget.example", Secret: testSecret, HTTPClient: op.srv.Client()})
	if err == nil || !strings.Contains(err.Error(), "issuer") {
		t.Fatalf("err %v", err)
	}
}

// Nextcloud answers the well-known URL with a 301 to /index.php/....
func TestNewFollowsDiscoveryRedirect(t *testing.T) {
	op := newOP(t)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/index.php/.well-known/openid-configuration", http.StatusMovedPermanently)
	})
	mux.HandleFunc("GET /index.php/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		op.discovery(w, r)
	})
	front := httptest.NewServer(mux)
	t.Cleanup(front.Close)
	op.issuer = front.URL

	a, err := New(context.Background(), Config{Issuer: front.URL, ClientID: testClientID, ClientSecret: testClientSecret,
		BaseURL: "https://budget.example", Secret: testSecret})
	if err != nil {
		t.Fatal(err)
	}
	if a.oidc.tokenURL != op.srv.URL+"/token" {
		t.Errorf("token endpoint %q", a.oidc.tokenURL)
	}
}

func assertFailed(t *testing.T, a *Auth, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code < 400 {
		t.Fatalf("status %d, want an error page", w.Code)
	}
	if _, ok := accountOf(t, a, w); ok {
		t.Fatal("session set despite failure")
	}
	mustContain(t, w.Body.String(), `href="/auth/login"`)
}

// flip changes the first character of a base64url string.
func flip(s string) string {
	if s[0] == 'A' {
		return "B" + s[1:]
	}
	return "A" + s[1:]
}
