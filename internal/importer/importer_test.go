package importer

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nogo/budget/internal/ledger"
)

// oldSchema is the old app's database as it exists in production, with its
// login tables, migration table and a review view.
const oldSchema = `
CREATE TABLE "categories" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "has_notes" BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE "transactions" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "amount" DECIMAL NOT NULL, "type" TEXT NOT NULL DEFAULT 'expense',
  "category_id" INTEGER NOT NULL, "date" INTEGER NOT NULL, "note" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE TABLE "templates" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "amount" DECIMAL NOT NULL, "type" TEXT NOT NULL DEFAULT 'expense',
  "category_id" INTEGER NOT NULL, "day" INTEGER NOT NULL, "note" TEXT NOT NULL DEFAULT '');
CREATE TABLE "user" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE TABLE "session" ("id" TEXT NOT NULL PRIMARY KEY, "token" TEXT NOT NULL);
CREATE TABLE "account" ("id" TEXT NOT NULL PRIMARY KEY, "password" TEXT);
CREATE TABLE "verification" ("id" TEXT NOT NULL PRIMARY KEY);
CREATE TABLE "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER);
CREATE VIEW review_years AS SELECT CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year, SUM(amount) AS total FROM transactions GROUP BY year;
INSERT INTO "user" VALUES ('u1', 'Invented Person');
INSERT INTO "session" VALUES ('s1', 'not-a-real-token');
INSERT INTO "__drizzle_migrations" (hash) VALUES ('abc');
`

func utc(s string) int64 {
	t, err := time.Parse("2006-01-02 15:04", s)
	if err != nil {
		panic(err)
	}
	return t.Unix()
}

type oldRow struct {
	id     int64
	amount any
	typ    string
	cat    int64
	date   int64
	want   string // Berlin day
}

// oldRows mix the three date conventions of the old data: midnight Berlin
// (22:00 or 23:00 UTC the day before), midnight UTC and real times of day.
var oldRows = []oldRow{
	{1, 10, "expense", 1, utc("2026-03-31 22:00"), "2026-04-01"},      // midnight Berlin, summer time, 1st of month
	{2, 2.5, "expense", 2, utc("2026-01-31 23:00"), "2026-02-01"},     // midnight Berlin, winter time, 1st of month
	{3, 100, "income", 1, utc("2026-02-01 00:00"), "2026-02-01"},      // midnight UTC
	{5, 4.99, "expense", 2, utc("2026-05-10 10:30"), "2026-05-10"},    // daytime
	{6, 7.1, "expense", 1, utc("2026-03-28 23:00"), "2026-03-29"},     // midnight Berlin on the spring switch day
	{7, 1.01, "expense", 1, utc("2026-03-29 22:00"), "2026-03-30"},    // first midnight after the spring switch
	{8, 3.3, "income", 2, utc("2026-10-24 22:00"), "2026-10-25"},      // midnight Berlin on the autumn switch day
	{9, 0.7, "expense", 2, utc("2026-10-25 23:00"), "2026-10-26"},     // first midnight after the autumn switch
	{10, 12.345, "expense", 1, utc("2025-12-31 00:00"), "2025-12-31"}, // midnight UTC on New Year's Eve
	{12, 20, "expense", 1, utc("2025-12-31 23:00"), "2026-01-01"},     // midnight Berlin on New Year
	{13, 0.1, "expense", 2, utc("2026-07-31 21:59"), "2026-07-31"},    // late evening, still the 31st in Berlin
}

func writeOld(t *testing.T, path string, rows []oldRow) {
	t.Helper()
	db, err := sql.Open("sqlite3", "file:"+path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := db.Exec(oldSchema); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO categories (id, name, has_notes) VALUES (1, 'Bäcker', 0), (2, 'Lebensmittel', 1), (4, 'Leer', 1)`); err != nil {
		t.Fatal(err)
	}
	for _, r := range rows {
		if _, err := db.Exec(`INSERT INTO transactions (id, amount, type, category_id, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
			r.id, r.amount, r.typ, r.cat, r.date, "note "+r.want); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec(`INSERT INTO templates (id, amount, type, category_id, day, note) VALUES (3, 0, 'expense', 2, 31, 'Ende'), (7, 25.5, 'income', 1, 1, '')`); err != nil {
		t.Fatal(err)
	}
	// A deleted row leaves the counter above the highest id.
	if _, err := db.Exec(`INSERT INTO transactions (id, amount, category_id, date) VALUES (50, 1, 1, 0); DELETE FROM transactions WHERE id = 50`); err != nil {
		t.Fatal(err)
	}
}

func TestImport(t *testing.T) {
	dir := t.TempDir()
	oldPath := filepath.Join(dir, "old.sqlite")
	writeOld(t, oldPath, oldRows)
	before, _ := os.ReadFile(oldPath)
	newPath := filepath.Join(dir, "out", "household.sqlite")
	os.Mkdir(filepath.Dir(newPath), 0o700)

	c, err := Import(context.Background(), oldPath, newPath)
	if err != nil {
		t.Fatal(err)
	}
	if c != (Counts{Categories: 3, Transactions: len(oldRows), Templates: 2}) {
		t.Errorf("counts %+v", c)
	}
	after, _ := os.ReadFile(oldPath)
	if !bytes.Equal(before, after) {
		t.Error("old file changed")
	}
	entries, _ := os.ReadDir(filepath.Dir(newPath))
	if len(entries) != 1 {
		t.Errorf("target dir holds %d entries, want only the ledger", len(entries))
	}

	l, err := ledger.Open(newPath)
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	ctx := context.Background()
	for _, r := range oldRows {
		got, err := l.Transaction(ctx, r.id)
		if err != nil {
			t.Fatalf("id %d: %v", r.id, err)
		}
		if got.Date != r.want || got.Note != "note "+r.want || got.CategoryID != r.cat || string(got.Type) != r.typ {
			t.Errorf("id %d: %+v, want date %s", r.id, got, r.want)
		}
	}
	if got, _ := l.Transaction(ctx, 10); got.Amount != 12.35 {
		t.Errorf("amount %v, want rounded to cents", got.Amount)
	}
	cats, _ := l.Categories(ctx)
	if len(cats) != 3 || cats[2] != (ledger.Category{ID: 4, Name: "Leer", HasNotes: true}) || cats[0].HasNotes {
		t.Errorf("categories %+v", cats)
	}
	tps, _ := l.Templates(ctx, 0)
	if len(tps) != 2 || tps[0].ID != 7 || tps[1].Day != 31 || tps[1].Amount != 0 {
		t.Errorf("templates %+v", tps)
	}
	// A new transaction gets an id above every old one, deleted ones included.
	created, _, err := l.CreateTransaction(ctx, "after-import", ledger.TransactionInput{Amount: 1, Type: ledger.Expense, CategoryID: 1, Date: "2026-10-12"})
	if err != nil || created.ID != 51 {
		t.Errorf("new id %d, %v; want 51", created.ID, err)
	}
	// April review counts the 1st of April in April.
	months, _ := l.ReviewMonths(ctx, 2026, nil)
	if len(months) == 0 || months[0].Month != 1 {
		t.Errorf("months %+v", months)
	}

	db, _ := sql.Open("sqlite3", "file:"+newPath+"?mode=ro")
	defer db.Close()
	var leftovers int
	db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE name IN ('user', 'session', 'account', 'verification', '__drizzle_migrations', 'review_years')`).Scan(&leftovers)
	if leftovers != 0 {
		t.Errorf("%d old tables or views carried over", leftovers)
	}
}

func TestImportRefusesExistingTarget(t *testing.T) {
	dir := t.TempDir()
	oldPath := filepath.Join(dir, "old.sqlite")
	writeOld(t, oldPath, oldRows)
	newPath := filepath.Join(dir, "new.sqlite")
	os.WriteFile(newPath, []byte("keep me"), 0o600)
	if _, err := Import(context.Background(), oldPath, newPath); err == nil {
		t.Fatal("import over an existing file succeeded")
	}
	if b, _ := os.ReadFile(newPath); string(b) != "keep me" {
		t.Error("existing target changed")
	}
}

func TestImportFailureLeavesNothing(t *testing.T) {
	dir := t.TempDir()
	oldPath := filepath.Join(dir, "old.sqlite")
	rows := append([]oldRow{}, oldRows...)
	rows = append(rows, oldRow{99, 0, "expense", 1, utc("2026-01-01 10:00"), "2026-01-01"}) // amount 0 breaks the new schema
	writeOld(t, oldPath, rows)
	newPath := filepath.Join(dir, "new.sqlite")
	if _, err := Import(context.Background(), oldPath, newPath); err == nil {
		t.Fatal("import of a zero amount succeeded")
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) != 1 {
		var names []string
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("dir holds %v, want only the old file", names)
	}
}

func TestVerifyFindsDifference(t *testing.T) {
	dir := t.TempDir()
	oldPath := filepath.Join(dir, "old.sqlite")
	writeOld(t, oldPath, oldRows)
	berlin, _ := time.LoadLocation("Europe/Berlin")
	old, _ := sql.Open("sqlite3", "file:"+oldPath+"?mode=ro")
	defer old.Close()
	ctx := context.Background()

	for name, tamper := range map[string]string{
		"moved day":     `UPDATE transactions SET date = date - 86400 WHERE id = 1`,
		"changed sum":   `UPDATE transactions SET amount = amount + 0.01 WHERE id = 5`,
		"changed type":  `UPDATE transactions SET type = 'income' WHERE id = 2`,
		"missing row":   `DELETE FROM transactions WHERE id = 13`,
		"extra row":     `INSERT INTO transactions (amount, category_id, date) VALUES (1, 1, 0)`,
		"lost template": `DELETE FROM templates WHERE id = 3`,
	} {
		path := filepath.Join(dir, name+".sqlite")
		if err := ledger.Create(path); err != nil {
			t.Fatal(err)
		}
		c, err := copyRows(ctx, old, path, berlin)
		if err != nil {
			t.Fatal(err)
		}
		if err := verify(ctx, old, path, berlin, c); err != nil {
			t.Fatalf("%s: untampered copy fails: %v", name, err)
		}
		db, _ := sql.Open("sqlite3", "file:"+path)
		if _, err := db.Exec(tamper); err != nil {
			t.Fatal(err)
		}
		db.Close()
		if err := verify(ctx, old, path, berlin, c); !errors.Is(err, ErrMismatch) {
			t.Errorf("%s: verify = %v, want ErrMismatch", name, err)
		}
	}
}

func TestBerlinDay(t *testing.T) {
	berlin, _ := time.LoadLocation("Europe/Berlin")
	for _, r := range oldRows {
		if got := ledger.FormatDate(BerlinDay(r.date, berlin)); got != r.want {
			t.Errorf("%s UTC: %s, want %s", time.Unix(r.date, 0).UTC(), got, r.want)
		}
	}
}
