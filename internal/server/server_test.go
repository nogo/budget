package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/nogo/budget/internal/access"
	"github.com/nogo/budget/internal/ledger"
)

// fakeAccounts takes the account from the X-Test-Account header.
type fakeAccounts struct{}

func (fakeAccounts) Account(w http.ResponseWriter, r *http.Request) (string, bool) {
	a := r.Header.Get("X-Test-Account")
	return a, a != ""
}

type testServer struct {
	t   *testing.T
	srv *Server
	h   http.Handler
}

func newTestServer(t *testing.T, lang string) *testServer {
	t.Helper()
	dir := t.TempDir()
	list, err := access.Open(buildFixture(t, dir, time.Date(2026, 10, 12, 9, 0, 0, 0, time.UTC)), dir)
	if err != nil {
		t.Fatal(err)
	}
	srv := New(Config{Lang: lang, Currency: "EUR", Version: "test"}, fakeAccounts{}, list, nil)
	t.Cleanup(func() { srv.Close() })
	mux := http.NewServeMux()
	srv.Register(mux)
	return &testServer{t: t, srv: srv, h: mux}
}

// do sends a request as account; body, when not empty, goes as JSON.
func (ts *testServer) do(account, method, path, body string) *httptest.ResponseRecorder {
	ts.t.Helper()
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json; charset=utf-8")
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	if account != "" {
		r.Header.Set("X-Test-Account", account)
	}
	w := httptest.NewRecorder()
	ts.h.ServeHTTP(w, r)
	return w
}

func decodeBody[T any](t *testing.T, w *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %q: %v", w.Body.String(), err)
	}
	return v
}

func wantStatus(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status %d, want %d; body %s", w.Code, status, w.Body.String())
	}
}

const hh = "/api/ledgers/household"

func TestNoSessionIs401(t *testing.T) {
	ts := newTestServer(t, "de")
	for _, p := range []string{"/api/session", hh + "/categories", hh + "/transactions?month=2026-10"} {
		w := ts.do("", "GET", p, "")
		wantStatus(t, w, http.StatusUnauthorized)
		if e := decodeBody[errorBody](t, w); e.Error != "Bitte melde dich an." {
			t.Errorf("%s: %+v", p, e)
		}
	}
}

func TestLedgerOfOtherAccountIs403(t *testing.T) {
	ts := newTestServer(t, "en")
	wantStatus(t, ts.do("john", "GET", "/api/ledgers/kid/categories", ""), http.StatusForbidden)
	wantStatus(t, ts.do("john", "GET", "/api/ledgers/nope/categories", ""), http.StatusForbidden)
	wantStatus(t, ts.do("stranger", "GET", hh+"/categories", ""), http.StatusForbidden)
	wantStatus(t, ts.do("jane", "GET", "/api/ledgers/kid/categories", ""), http.StatusOK)
}

func TestSession(t *testing.T) {
	ts := newTestServer(t, "en")
	w := ts.do("john", "GET", "/api/session", "")
	wantStatus(t, w, http.StatusOK)
	got := decodeBody[map[string]any](t, w)
	want := map[string]any{"account": "john", "lang": "en", "currency": "EUR", "version": "test",
		"ledgers": []any{map[string]any{"id": "household", "name": "Haushalt"}}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("session = %v, want %v", got, want)
	}
}

func TestWriteNeedsJSON(t *testing.T) {
	ts := newTestServer(t, "de")
	r := httptest.NewRequest("POST", hh+"/categories", strings.NewReader(`{"name":"X"}`))
	r.Header.Set("Content-Type", "text/plain")
	r.Header.Set("X-Test-Account", "jane")
	w := httptest.NewRecorder()
	ts.h.ServeHTTP(w, r)
	wantStatus(t, w, http.StatusUnsupportedMediaType)
}

func TestCreateTransactionWithKey(t *testing.T) {
	ts := newTestServer(t, "de")
	body := `{"key":"abcdefgh-1","amount":12.345,"type":"expense","categoryId":2,"date":"2026-10-12","note":" Kuchen "}`
	w := ts.do("jane", "POST", hh+"/transactions", body)
	wantStatus(t, w, http.StatusCreated)
	first := decodeBody[ledger.Transaction](t, w)
	if first.Amount != 12.35 || first.Category != "Lebensmittel" || first.Note != "Kuchen" || first.Date != "2026-10-12" {
		t.Errorf("created %+v", first)
	}
	w = ts.do("jane", "POST", hh+"/transactions", strings.Replace(body, "12.345", "99", 1))
	wantStatus(t, w, http.StatusOK)
	if again := decodeBody[ledger.Transaction](t, w); again != first {
		t.Errorf("resent = %+v, want %+v", again, first)
	}
	w = ts.do("jane", "GET", hh+"/transactions/"+itoa(first.ID), "")
	wantStatus(t, w, http.StatusOK)
}

func itoa(i int64) string { return strconv.FormatInt(i, 10) }

func TestValidationErrorNamesField(t *testing.T) {
	ts := newTestServer(t, "en")
	cases := map[string]string{
		`{"key":"abcdefgh-2","amount":0,"type":"expense","categoryId":2,"date":"2026-10-12"}`:   "amount",
		`{"key":"abcdefgh-2","amount":1,"type":"gift","categoryId":2,"date":"2026-10-12"}`:      "type",
		`{"key":"abcdefgh-2","amount":1,"type":"expense","categoryId":99,"date":"2026-10-12"}`:  "categoryId",
		`{"key":"abcdefgh-2","amount":1,"type":"expense","categoryId":2,"date":"2026-02-30"}`:   "date",
		`{"key":"short","amount":1,"type":"expense","categoryId":2,"date":"2026-10-12"}`:        "key",
		`{"key":"abcdefgh-2","amount":"1","type":"expense","categoryId":2,"date":"2026-10-12"}`: "amount",
	}
	for body, field := range cases {
		w := ts.do("jane", "POST", hh+"/transactions", body)
		wantStatus(t, w, http.StatusBadRequest)
		e := decodeBody[errorBody](t, w)
		if e.Field != field || e.Error == "" || strings.Contains(e.Error, "ledger:") {
			t.Errorf("%s: %+v, want field %s", body, e, field)
		}
	}
	w := ts.do("jane", "POST", hh+"/transactions", `{not json`)
	wantStatus(t, w, http.StatusBadRequest)
	if e := decodeBody[errorBody](t, w); e.Field != "" || e.Error != "The request is not valid." {
		t.Errorf("bad json: %+v", e)
	}
}

func TestTransactionNotFound(t *testing.T) {
	ts := newTestServer(t, "de")
	wantStatus(t, ts.do("jane", "GET", hh+"/transactions/9999", ""), http.StatusNotFound)
	wantStatus(t, ts.do("jane", "GET", hh+"/transactions/abc", ""), http.StatusNotFound)
	wantStatus(t, ts.do("jane", "DELETE", hh+"/transactions/9999", ""), http.StatusNotFound)
	wantStatus(t, ts.do("jane", "PUT", hh+"/transactions/9999",
		`{"amount":1,"type":"expense","categoryId":2,"date":"2026-10-12"}`), http.StatusNotFound)
}

func TestUpdateAndDeleteTransaction(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "PUT", hh+"/transactions/1", `{"amount":3,"type":"income","categoryId":1,"date":"2026-10-02","note":"x"}`)
	wantStatus(t, w, http.StatusOK)
	got := decodeBody[ledger.Transaction](t, w)
	if got != (ledger.Transaction{ID: 1, Amount: 3, Type: ledger.Income, CategoryID: 1, Category: "Bäcker", Date: "2026-10-02", Note: "x"}) {
		t.Errorf("updated %+v", got)
	}
	wantStatus(t, ts.do("jane", "DELETE", hh+"/transactions/1", ""), http.StatusNoContent)
	wantStatus(t, ts.do("jane", "GET", hh+"/transactions/1", ""), http.StatusNotFound)
}

func TestListTransactionsSearch(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "GET", hh+"/transactions?month=2026-10", "")
	wantStatus(t, w, http.StatusOK)
	if got := decodeBody[[]ledger.Transaction](t, w); len(got) != 20 || got[0].Date != "2026-10-28" {
		t.Errorf("month: %d rows, first %+v", len(got), got[0])
	}
	w = ts.do("jane", "GET", hh+"/transactions?month=2026-10&q=b%C3%A4cker", "")
	if got := decodeBody[[]ledger.Transaction](t, w); len(got) != 4 {
		t.Errorf("bäcker: %d rows, want 4 across months", len(got))
	}
	w = ts.do("jane", "GET", hh+"/transactions?month=2026-10&q=%23leb", "")
	if got := decodeBody[[]ledger.Transaction](t, w); len(got) != 6 {
		t.Errorf("#leb: %d rows, want 6 in October", len(got))
	}
	w = ts.do("jane", "GET", hh+"/transactions?month=2026-10&q=kuchen+%23leb", "")
	if got := decodeBody[[]ledger.Transaction](t, w); len(got) != 4 {
		t.Errorf("kuchen #leb: %d rows, want 4 across months", len(got))
	}
	w = ts.do("jane", "GET", hh+"/transactions?month=nope", "")
	wantStatus(t, w, http.StatusBadRequest)
	if e := decodeBody[errorBody](t, w); e.Field != "month" {
		t.Errorf("bad month: %+v", e)
	}
	w = ts.do("jane", "GET", "/api/ledgers/kid/transactions?month=2026-10", "")
	if got := decodeBody[[]ledger.Transaction](t, w); len(got) != 3 {
		t.Errorf("kid: %d rows", len(got))
	}
}

func TestCategoryRoutes(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "POST", hh+"/categories", `{"name":"Urlaub","hasNotes":true}`)
	wantStatus(t, w, http.StatusCreated)
	c := decodeBody[ledger.Category](t, w)
	if c != (ledger.Category{ID: 7, Name: "Urlaub", HasNotes: true}) {
		t.Errorf("created %+v", c)
	}
	w = ts.do("jane", "POST", hh+"/categories", `{"name":"Urlaub"}`)
	wantStatus(t, w, http.StatusConflict)
	if e := decodeBody[errorBody](t, w); e.Error != "Diesen Namen gibt es schon." {
		t.Errorf("duplicate: %+v", e)
	}
	wantStatus(t, ts.do("jane", "PUT", hh+"/categories/7", `{"name":"Reisen","hasNotes":false}`), http.StatusOK)
	w = ts.do("jane", "DELETE", hh+"/categories/2", "")
	wantStatus(t, w, http.StatusConflict)
	if e := decodeBody[errorBody](t, w); !strings.Contains(e.Error, "Kategorie") {
		t.Errorf("in use: %+v", e)
	}
	wantStatus(t, ts.do("jane", "DELETE", hh+"/categories/7", ""), http.StatusNoContent)
	w = ts.do("jane", "GET", hh+"/categories", "")
	if got := decodeBody[[]ledger.Category](t, w); len(got) != 6 || got[0].Name != "Bäcker" {
		t.Errorf("list %+v", got)
	}
}

func TestTemplateRoutes(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "GET", hh+"/templates", "")
	all := decodeBody[[]ledger.Template](t, w)
	if len(all) != 5 || all[0].Day != 1 || all[4].Day != 31 {
		t.Errorf("all %+v", all)
	}
	w = ts.do("jane", "GET", hh+"/templates?category=4", "")
	if got := decodeBody[[]ledger.Template](t, w); len(got) != 2 || got[0].Day != 13 {
		t.Errorf("category 4: %+v", got)
	}
	wantStatus(t, ts.do("jane", "GET", hh+"/templates?category=x", ""), http.StatusBadRequest)
	w = ts.do("jane", "POST", hh+"/templates", `{"amount":0,"type":"expense","categoryId":3,"day":31,"note":""}`)
	wantStatus(t, w, http.StatusCreated)
	tp := decodeBody[ledger.Template](t, w)
	wantStatus(t, ts.do("jane", "GET", hh+"/templates/"+itoa(tp.ID), ""), http.StatusOK)
	w = ts.do("jane", "PUT", hh+"/templates/"+itoa(tp.ID), `{"amount":1,"type":"income","categoryId":3,"day":32}`)
	wantStatus(t, w, http.StatusBadRequest)
	if e := decodeBody[errorBody](t, w); e.Field != "day" {
		t.Errorf("day: %+v", e)
	}
	wantStatus(t, ts.do("jane", "DELETE", hh+"/templates/"+itoa(tp.ID), ""), http.StatusNoContent)
	wantStatus(t, ts.do("jane", "GET", hh+"/templates/"+itoa(tp.ID), ""), http.StatusNotFound)
}

func TestReviewRoutes(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "GET", hh+"/review/years", "")
	wantStatus(t, w, http.StatusOK)
	years := decodeBody[[]ledger.YearSum](t, w)
	if len(years) != 3 || years[0].Year != 2024 || years[2] != (ledger.YearSum{Year: 2026, Income: 5240, Expense: 876.4}) {
		t.Errorf("years %+v", years)
	}
	w = ts.do("jane", "GET", hh+"/review/years?categories=6", "")
	if got := decodeBody[[]ledger.YearSum](t, w); len(got) != 3 || got[0].Expense != 0 || got[0].Income != 2380 {
		t.Errorf("years of 6: %+v", got)
	}
	wantStatus(t, ts.do("jane", "GET", hh+"/review/years?categories=a", ""), http.StatusBadRequest)
	w = ts.do("jane", "GET", hh+"/review/2026?categories=1,2", "")
	months := decodeBody[[]ledger.MonthSum](t, w)
	if len(months) != 2 || months[0].Month != 9 || months[1].Month != 10 {
		t.Errorf("months %+v", months)
	}
	w = ts.do("jane", "GET", hh+"/review/2026/10", "")
	cats := decodeBody[[]ledger.CategorySum](t, w)
	if len(cats) != 6 || cats[0].CategoryID != 1 || cats[5].Income != 2620 {
		t.Errorf("categories %+v", cats)
	}
	w = ts.do("jane", "GET", hh+"/review/categories?year=2026", "")
	wantStatus(t, w, http.StatusOK)
	grid := decodeBody[[]ledger.CategoryPeriod](t, w)
	if len(grid) == 0 || grid[0].Period < 1 || grid[len(grid)-1].Period > 12 {
		t.Errorf("grid of 2026 %+v", grid)
	}
	w = ts.do("jane", "GET", hh+"/review/categories", "")
	if got := decodeBody[[]ledger.CategoryPeriod](t, w); len(got) == 0 || got[0].Period != 2024 {
		t.Errorf("grid by year %+v", got)
	}
	wantStatus(t, ts.do("jane", "GET", hh+"/review/categories?year=x", ""), http.StatusBadRequest)
	wantStatus(t, ts.do("jane", "GET", hh+"/review/2026/13", ""), http.StatusNotFound)
	wantStatus(t, ts.do("jane", "GET", hh+"/review/abc", ""), http.StatusNotFound)
}

func TestUnknownAPIPathIsJSON404(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("jane", "GET", "/api/nothing", "")
	wantStatus(t, w, http.StatusNotFound)
	if !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") {
		t.Errorf("content type %q", w.Header().Get("Content-Type"))
	}
	wantStatus(t, ts.do("", "GET", "/auth/nothing", ""), http.StatusNotFound)
}

func TestClosedServerAnswers503(t *testing.T) {
	ts := newTestServer(t, "de")
	wantStatus(t, ts.do("jane", "GET", hh+"/categories", ""), http.StatusOK)
	if err := ts.srv.Close(); err != nil {
		t.Fatal(err)
	}
	wantStatus(t, ts.do("jane", "GET", hh+"/categories", ""), http.StatusServiceUnavailable)
}

func TestStaticFiles(t *testing.T) {
	files := fstest.MapFS{
		"index.html":           {Data: []byte("<!doctype html>")},
		"sw.js":                {Data: []byte("// sw")},
		"js/app.js":            {Data: []byte("// app")},
		"manifest.webmanifest": {Data: []byte("{}")},
		"manifest.json":        {Data: []byte("{}")},
		"style.css":            {Data: []byte("body{}")},
	}
	h := staticFS(files)
	cases := []struct {
		path, ctype, cache, body string
		status                   int
	}{
		{"/", "text/html; charset=utf-8", "no-cache", "<!doctype html>", 200},
		{"/2026-10", "text/html; charset=utf-8", "no-cache", "<!doctype html>", 200},
		{"/review/2026/3", "text/html; charset=utf-8", "no-cache", "<!doctype html>", 200},
		{"/sw.js", "text/javascript; charset=utf-8", "no-cache", "// sw", 200}, // no placeholders, served as is
		{"/js/app.js", "text/javascript; charset=utf-8", "", "// app", 200},
		{"/manifest.webmanifest", "application/manifest+json", "", "{}", 200},
		{"/manifest.json", "application/json", "", "{}", 200},
		{"/style.css", "text/css; charset=utf-8", "", "body{}", 200},
		{"/missing.js", "", "", "", 404},
		{"/api/x", "", "", "", 404},
		{"/auth/x", "", "", "", 404},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", c.path, nil))
		if w.Code != c.status {
			t.Errorf("%s: status %d", c.path, w.Code)
			continue
		}
		if c.status != 200 {
			continue
		}
		if w.Header().Get("Content-Type") != c.ctype || w.Header().Get("Cache-Control") != c.cache || w.Body.String() != c.body {
			t.Errorf("%s: type %q cache %q body %q", c.path, w.Header().Get("Content-Type"), w.Header().Get("Cache-Control"), w.Body.String())
		}
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/", nil))
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST /: %d", w.Code)
	}
}

func TestEmbeddedFilesAreServed(t *testing.T) {
	ts := newTestServer(t, "de")
	for _, p := range []string{"/", "/index.html", "/sw.js", "/manifest.json", "/style.css", "/js/app.js"} {
		wantStatus(t, ts.do("", "GET", p, ""), http.StatusOK)
	}
}

func TestServiceWorkerListsShellAndHashesIt(t *testing.T) {
	src := "const CACHE = 'budget-shell-dev';\nconst SHELL = ['/'];\n"
	files := fstest.MapFS{
		"index.html":      {Data: []byte("<!doctype html>")},
		"sw.js":           {Data: []byte(src)},
		"js/app.js":       {Data: []byte("// app")},
		"auril/LICENSE":   {Data: []byte("MIT")},
		"auril/README.md": {Data: []byte("# auril")},
		"img/favicon.ico": {Data: []byte("ico")},
		"style.css":       {Data: []byte("body{}")},
	}
	serve := func(files fstest.MapFS) string {
		w := httptest.NewRecorder()
		staticFS(files).ServeHTTP(w, httptest.NewRequest("GET", "/sw.js", nil))
		return w.Body.String()
	}
	first := serve(files)
	if !strings.Contains(first, `const SHELL = ["/","/img/favicon.ico","/js/app.js","/style.css"];`) {
		t.Fatalf("shell list: %s", first)
	}
	if strings.Contains(first, "budget-shell-dev") {
		t.Fatalf("cache name not filled in: %s", first)
	}
	files["js/app.js"] = &fstest.MapFile{Data: []byte("// app v2")}
	if second := serve(files); second == first {
		t.Fatal("a changed file must change the cache name")
	}
}

func TestNoSessionTellsLanguage(t *testing.T) {
	ts := newTestServer(t, "en")
	w := ts.do("", "GET", "/api/session", "")
	wantStatus(t, w, http.StatusUnauthorized)
	if !strings.Contains(w.Body.String(), `"lang":"en"`) {
		t.Fatalf("401 body: %s", w.Body.String())
	}
}

func TestHealthzNeedsNoSession(t *testing.T) {
	ts := newTestServer(t, "de")
	w := ts.do("", "GET", "/healthz", "")
	wantStatus(t, w, http.StatusOK)
}

func TestHeadersOnEveryResponse(t *testing.T) {
	h := Headers(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if got := w.Header().Get("Content-Security-Policy"); !strings.Contains(got, "frame-ancestors 'none'") || !strings.Contains(got, "script-src 'self'") {
		t.Fatalf("csp: %q", got)
	}
	if w.Header().Get("X-Frame-Options") != "DENY" || w.Header().Get("Strict-Transport-Security") != "" {
		t.Fatalf("headers over http: %v", w.Header())
	}
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Forwarded-Proto", "https")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Header().Get("Strict-Transport-Security") == "" {
		t.Fatal("no HSTS behind an https proxy")
	}
}
