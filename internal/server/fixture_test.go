package server

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nogo/budget/internal/access"
	"github.com/nogo/budget/internal/auth"
	"github.com/nogo/budget/internal/ledger"
)

// fixtureCategories of the household ledger, in id order.
var fixtureCategories = []ledger.CategoryInput{
	{Name: "Bäcker"},
	{Name: "Lebensmittel"},
	{Name: "Mittag"},
	{Name: "Unterhaltung", HasNotes: true},
	{Name: "Fahrtkosten", HasNotes: true},
	{Name: "Gehalt"},
}

type fixtureRow struct {
	day      int
	category int64 // 1-based index into the ledger's categories
	amount   float64
	typ      ledger.Type
	note     string
}

// monthRows is one month of invented household spending; it repeats for
// the current and the previous month.
var monthRows = []fixtureRow{
	{1, 6, 2500, ledger.Income, ""},
	{1, 1, 3.2, ledger.Expense, "Brötchen"},
	{2, 2, 54.37, ledger.Expense, "Wocheneinkauf"},
	{3, 5, 49, ledger.Expense, "Monatskarte"},
	{4, 3, 8.5, ledger.Expense, ""},
	{5, 1, 4.1, ledger.Expense, ""},
	{6, 2, 12.99, ledger.Expense, "Kuchen"},
	{8, 4, 15, ledger.Expense, "Kino"},
	{9, 2, 61.2, ledger.Expense, "Wocheneinkauf"},
	{10, 3, 9.9, ledger.Expense, ""},
	{12, 1, 2.6, ledger.Expense, ""},
	{13, 4, 12.99, ledger.Expense, "Streaming"},
	{15, 2, 47.8, ledger.Expense, ""},
	{16, 5, 23.5, ledger.Expense, "Tanken"},
	{18, 3, 11.4, ledger.Expense, ""},
	{20, 2, 33.05, ledger.Expense, "Markt"},
	{22, 1, 5.5, ledger.Expense, "Kuchen vom Bäcker"},
	{24, 6, 120, ledger.Income, "Rückerstattung"},
	{26, 2, 58.1, ledger.Expense, ""},
	{28, 4, 25, ledger.Expense, "Konzert"},
}

// yearRows are a few rows in each of two earlier years.
var yearRows = []fixtureRow{
	{1, 6, 2300, ledger.Income, ""},
	{1, 2, 44.1, ledger.Expense, "Kuchen"},
	{5, 1, 3.8, ledger.Expense, ""},
	{9, 4, 18, ledger.Expense, "Theater"},
	{14, 2, 51.3, ledger.Expense, ""},
	{19, 5, 19.9, ledger.Expense, "Bahn"},
	{23, 3, 7.7, ledger.Expense, ""},
	{27, 1, 6.4, ledger.Expense, "Bäckerei Sonntag"},
	{28, 2, 39.95, ledger.Expense, ""},
	{28, 6, 80, ledger.Income, "Flohmarkt"},
}

var fixtureTemplates = []ledger.TemplateInput{
	{Amount: 2500, Type: ledger.Income, CategoryID: 6, Day: 1},
	{Amount: 49, Type: ledger.Expense, CategoryID: 5, Day: 3, Note: "Monatskarte"},
	{Amount: 0, Type: ledger.Expense, CategoryID: 3, Day: 15, Note: "Kantine"},
	{Amount: 12.99, Type: ledger.Expense, CategoryID: 4, Day: 13, Note: "Streaming"},
	{Amount: 9.5, Type: ledger.Expense, CategoryID: 4, Day: 31, Note: "Monatsende"},
}

// buildFixture writes an invented instance into dir: two ledgers,
// household and kid, and access.json giving jane both and john household.
// Household holds transactions in the month of now, the month before, and
// in two earlier years. It returns the path of access.json.
func buildFixture(t testing.TB, dir string, now time.Time) string {
	t.Helper()
	ctx := context.Background()
	month := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	key := 0
	add := func(l *ledger.Ledger, first time.Time, rows []fixtureRow) {
		for _, r := range rows {
			key++
			date := first.AddDate(0, 0, r.day-1).Format("2006-01-02")
			in := ledger.TransactionInput{Amount: r.amount, Type: r.typ, CategoryID: r.category, Date: date, Note: r.note}
			if _, _, err := l.CreateTransaction(ctx, fmt.Sprintf("fixture-%04d", key), in); err != nil {
				t.Fatalf("fixture transaction %+v: %v", r, err)
			}
		}
	}
	create := func(file string, cats []ledger.CategoryInput) *ledger.Ledger {
		path := filepath.Join(dir, file)
		if err := ledger.Create(path); err != nil {
			t.Fatal(err)
		}
		l, err := ledger.Open(path)
		if err != nil {
			t.Fatal(err)
		}
		for _, c := range cats {
			if _, err := l.CreateCategory(ctx, c); err != nil {
				t.Fatal(err)
			}
		}
		return l
	}

	h := create("household.sqlite", fixtureCategories)
	add(h, month, monthRows)
	add(h, month.AddDate(0, -1, 0), monthRows)
	for _, back := range []int{1, 2} {
		y := now.Year() - back
		add(h, time.Date(y, 3, 1, 0, 0, 0, 0, time.UTC), yearRows[:5])
		add(h, time.Date(y, 11, 1, 0, 0, 0, 0, time.UTC), yearRows[5:])
	}
	for _, tp := range fixtureTemplates {
		if _, err := h.CreateTemplate(ctx, tp); err != nil {
			t.Fatal(err)
		}
	}
	h.Close()

	k := create("kid.sqlite", []ledger.CategoryInput{{Name: "Taschengeld"}, {Name: "Süßigkeiten", HasNotes: true}})
	add(k, month, []fixtureRow{{1, 1, 10, ledger.Income, ""}, {4, 2, 1.5, ledger.Expense, "Eis"}, {11, 2, 0.8, ledger.Expense, "Gummibärchen"}})
	add(k, month.AddDate(0, -1, 0), []fixtureRow{{1, 1, 10, ledger.Income, ""}, {20, 2, 2.2, ledger.Expense, "Schokolade"}})
	if _, err := k.CreateTemplate(ctx, ledger.TemplateInput{Amount: 10, Type: ledger.Income, CategoryID: 1, Day: 1}); err != nil {
		t.Fatal(err)
	}
	k.Close()

	accessFile := map[string]any{
		"ledgers": []map[string]string{
			{"id": "household", "name": "Haushalt", "file": "household.sqlite"},
			{"id": "kid", "name": "Kid", "file": "kid.sqlite"},
		},
		"accounts": map[string][]string{"jane": {"household", "kid"}, "john": {"household"}},
	}
	raw, _ := json.MarshalIndent(accessFile, "", "  ")
	path := filepath.Join(dir, "access.json")
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

// TestServeFixture runs the real handlers on an invented fixture for the
// browser checks in testdata/. It only runs with BUDGET_SERVE=1, prints
// exactly one line "budget: http://127.0.0.1:PORT" and serves until killed
// (run it with -timeout 0). Login is the development login of internal/auth
// for the account in BUDGET_FIXTURE_ACCOUNT (default jane); the instance
// language is BUDGET_FIXTURE_LANG (default de).
func TestServeFixture(t *testing.T) {
	if os.Getenv("BUDGET_SERVE") != "1" {
		t.Skip("set BUDGET_SERVE=1 to serve the fixture")
	}
	account := envOr("BUDGET_FIXTURE_ACCOUNT", "jane")
	lang := envOr("BUDGET_FIXTURE_LANG", "de")
	dir := t.TempDir()
	list, err := access.Open(buildFixture(t, dir, time.Now()), dir)
	if err != nil {
		t.Fatal(err)
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	base := "http://" + ln.Addr().String()
	secret := make([]byte, 32)
	rand.Read(secret)
	a, err := auth.New(context.Background(), auth.Config{DevAccount: account, Secret: secret, BaseURL: base})
	if err != nil {
		t.Fatal(err)
	}
	srv := New(Config{Lang: lang, Currency: "EUR", Version: "fixture"}, a, list, nil)
	defer srv.Close()
	mux := http.NewServeMux()
	a.Register(mux)
	srv.Register(mux)
	fmt.Fprintf(os.Stdout, "budget: %s\n", base)
	t.Fatal(http.Serve(ln, Headers(mux)))
}

func envOr(name, def string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return def
}
