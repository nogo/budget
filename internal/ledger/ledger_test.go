package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
)

func newLedger(t *testing.T) *Ledger {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.sqlite")
	if err := Create(path); err != nil {
		t.Fatal(err)
	}
	l, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	return l
}

func mustCategory(t *testing.T, l *Ledger, name string) Category {
	t.Helper()
	c, err := l.CreateCategory(context.Background(), CategoryInput{Name: name})
	if err != nil {
		t.Fatal(err)
	}
	return c
}

var keyCounter atomic.Int64

func mustTx(t *testing.T, l *Ledger, cat int64, date string, amount float64, typ Type, note string) Transaction {
	t.Helper()
	key := fmt.Sprintf("testkey-%06d", keyCounter.Add(1))
	tr, created, err := l.CreateTransaction(context.Background(), key,
		TransactionInput{Amount: amount, Type: typ, CategoryID: cat, Date: date, Note: note})
	if err != nil || !created {
		t.Fatalf("create transaction: %v created=%v", err, created)
	}
	return tr
}

func ids(ts []Transaction) []int64 {
	out := []int64{}
	for _, t := range ts {
		out = append(out, t.ID)
	}
	return out
}

func TestCreateRefusesExistingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "x.sqlite")
	if err := Create(path); err != nil {
		t.Fatal(err)
	}
	if err := Create(path); err == nil {
		t.Fatal("second Create succeeded")
	}
}

func TestOpenRefusesMissingFile(t *testing.T) {
	if _, err := Open(filepath.Join(t.TempDir(), "missing.sqlite")); err == nil {
		t.Fatal("Open of a missing file succeeded")
	}
}

func TestOpenRefusesOtherVersion(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.sqlite")
	db, err := sql.Open(DriverName, "file:"+path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("CREATE TABLE x (a); PRAGMA user_version = 2"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	if _, err := Open(path); !errors.Is(err, ErrVersion) {
		t.Fatalf("Open = %v, want ErrVersion", err)
	}
}

func TestEveryConnectionHasPragmas(t *testing.T) {
	l := newLedger(t)
	for name, db := range map[string]*sql.DB{"write": l.write, "read": l.read} {
		var mode string
		var fk, busy int
		if err := db.QueryRow("PRAGMA journal_mode").Scan(&mode); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow("PRAGMA foreign_keys").Scan(&fk); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow("PRAGMA busy_timeout").Scan(&busy); err != nil {
			t.Fatal(err)
		}
		if mode != "wal" || fk != 1 || busy != 5000 {
			t.Errorf("%s: journal_mode=%s foreign_keys=%d busy_timeout=%d", name, mode, fk, busy)
		}
	}
}

func TestReadPoolCannotWrite(t *testing.T) {
	l := newLedger(t)
	if _, err := l.read.Exec("INSERT INTO categories (name) VALUES ('x')"); err == nil {
		t.Fatal("read pool accepted a write")
	}
}

func TestDates(t *testing.T) {
	u, ok := ParseDate("2026-03-01")
	if !ok || u != 1772323200 || u%86400 != 0 || FormatDate(u) != "2026-03-01" {
		t.Fatalf("ParseDate = %d %v", u, ok)
	}
	for _, bad := range []string{"2026-02-30", "2026-13-01", "2026-3-1", "", "2026-03-01T00:00:00Z"} {
		if _, ok := ParseDate(bad); ok {
			t.Errorf("ParseDate(%q) accepted", bad)
		}
	}
}

func TestSearchParityExamples(t *testing.T) {
	l := newLedger(t)
	leb := mustCategory(t, l, "Lebensmittel").ID
	baecker := mustCategory(t, l, "Bäcker").ID
	inOct := mustTx(t, l, leb, "2026-10-05", 10, Expense, "Kuchen vom Markt")
	octPlain := mustTx(t, l, leb, "2026-10-06", 20, Expense, "")
	inMay := mustTx(t, l, leb, "2026-05-05", 30, Expense, "kuchen")
	octBread := mustTx(t, l, baecker, "2026-10-07", 4.5, Expense, "Brot")
	mayBaecker := mustTx(t, l, baecker, "2025-05-07", 3, Expense, "Beim BÄCKER Schmidt")
	ctx := context.Background()

	got, err := l.Transactions(ctx, "2026-10", "bäcker")
	if err != nil {
		t.Fatal(err)
	}
	if want := []int64{mayBaecker.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("bäcker = %v, want %v (every month, umlaut case-insensitive)", ids(got), want)
	}

	got, _ = l.Transactions(ctx, "2026-10", "#leb")
	if want := []int64{octPlain.ID, inOct.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("#leb = %v, want %v (shown month only)", ids(got), want)
	}

	got, _ = l.Transactions(ctx, "2026-10", "kuchen #leb")
	if want := []int64{inOct.ID, inMay.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("kuchen #leb = %v, want %v (every month)", ids(got), want)
	}

	got, _ = l.Transactions(ctx, "2026-10", "#BÄ")
	if want := []int64{octBread.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("#BÄ = %v, want %v", ids(got), want)
	}
}

func TestSearchCategoryTerms(t *testing.T) {
	l := newLedger(t)
	a := mustCategory(t, l, "Lebensmittel").ID
	b := mustCategory(t, l, "Mittag").ID
	c := mustCategory(t, l, "Urlaub").ID
	ta := mustTx(t, l, a, "2026-10-01", 1, Expense, "")
	tb := mustTx(t, l, b, "2026-10-02", 2, Expense, "")
	mustTx(t, l, c, "2026-10-03", 3, Expense, "")
	ctx := context.Background()

	got, _ := l.Transactions(ctx, "2026-10", "#mittag #leb")
	if want := []int64{tb.ID, ta.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("two # terms = %v, want any of %v", ids(got), want)
	}
	got, _ = l.Transactions(ctx, "2026-10", "#mittel")
	if want := []int64{ta.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("#mittel = %v, want %v (partial)", ids(got), want)
	}
	got, _ = l.Transactions(ctx, "2026-10", "#nothing")
	if len(got) != 0 {
		t.Errorf("#nothing = %v, want no match", ids(got))
	}
}

func TestSearchAmounts(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	a := mustTx(t, l, c, "2026-10-01", 12.5, Expense, "")
	b := mustTx(t, l, c, "2026-10-02", 12, Income, "")
	mustTx(t, l, c, "2026-10-03", 0.1+0.2, Expense, "") // stored 0.3
	d := mustTx(t, l, c, "2026-10-04", 0.3, Expense, "")
	mustTx(t, l, c, "2026-09-01", 12.5, Expense, "")
	ctx := context.Background()

	for q, want := range map[string]int{"=12,50": 1, "=12.50": 1, "=12,5": 1, "=12": 1, "=12 =12.5": 2, "=0,30": 2, "=7": 0} {
		got, err := l.Transactions(ctx, "2026-10", q)
		if err != nil {
			t.Fatal(err)
		}
		if len(got) != want {
			t.Errorf("%q: %d results %v, want %d", q, len(got), ids(got), want)
		}
	}
	got, _ := l.Transactions(ctx, "2026-10", "=12")
	if len(got) != 1 || got[0].ID != b.ID {
		t.Errorf("=12 = %v, want %d", ids(got), b.ID)
	}
	got, _ = l.Transactions(ctx, "2026-10", "=12,50")
	if len(got) != 1 || got[0].ID != a.ID {
		t.Errorf("=12,50 = %v", ids(got))
	}
	_ = d
}

func TestSearchWordsAllMustMatch(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	both := mustTx(t, l, c, "2020-01-01", 1, Expense, "Grüne Äpfel vom Markt")
	mustTx(t, l, c, "2026-10-01", 1, Expense, "Äpfel")
	got, _ := l.Transactions(context.Background(), "2026-10", "äpfel  GRÜNE")
	if want := []int64{both.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("= %v, want %v", ids(got), want)
	}
}

func TestParseSearch(t *testing.T) {
	got := ParseSearch(" Kuchen #Leb =12,50 #bäck  frisch =3 ")
	want := Search{Categories: []string{"leb", "bäck"}, Cents: []int64{1250, 300}, Words: []string{"kuchen", "frisch"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("ParseSearch = %+v, want %+v", got, want)
	}
}

func TestMonthListOrderAndBounds(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	mustTx(t, l, c, "2026-09-30", 1, Expense, "")
	first := mustTx(t, l, c, "2026-10-01", 1, Expense, "")
	last := mustTx(t, l, c, "2026-10-31", 1, Expense, "")
	last2 := mustTx(t, l, c, "2026-10-31", 2, Income, "")
	mustTx(t, l, c, "2026-11-01", 1, Expense, "")
	got, err := l.Transactions(context.Background(), "2026-10", "")
	if err != nil {
		t.Fatal(err)
	}
	if want := []int64{last2.ID, last.ID, first.ID}; !reflect.DeepEqual(ids(got), want) {
		t.Errorf("= %v, want %v", ids(got), want)
	}
	if got[0].Date != "2026-10-31" || got[0].Category != "X" || got[0].Type != Income {
		t.Errorf("row = %+v", got[0])
	}
	if _, err := l.Transactions(context.Background(), "2026-13", ""); !isField(err, "month") {
		t.Errorf("bad month: %v", err)
	}
}

func isField(err error, field string) bool {
	var fe *FieldError
	return errors.As(err, &fe) && fe.Field == field && errors.Is(err, ErrInvalid)
}

func TestCreateTransactionIdempotent(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	ctx := context.Background()
	in := TransactionInput{Amount: 9.999, Type: Expense, CategoryID: c, Date: "2026-10-12", Note: "  hi "}
	first, created, err := l.CreateTransaction(ctx, "abcd-1234", in)
	if err != nil || !created {
		t.Fatalf("first: %v %v", err, created)
	}
	if first.Amount != 10 || first.Note != "hi" || first.Date != "2026-10-12" {
		t.Errorf("stored %+v", first)
	}
	in.Amount = 50
	again, created, err := l.CreateTransaction(ctx, "abcd-1234", in)
	if err != nil || created {
		t.Fatalf("again: %v created=%v", err, created)
	}
	if again != first {
		t.Errorf("again = %+v, want %+v", again, first)
	}
	all, _ := l.Transactions(ctx, "2026-10", "")
	if len(all) != 1 {
		t.Errorf("%d transactions, want 1", len(all))
	}
}

func TestCreateTransactionRollsBackOnBadCategory(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	_, _, err := l.CreateTransaction(ctx, "abcd-5678", TransactionInput{Amount: 1, Type: Expense, CategoryID: 99, Date: "2026-10-12"})
	if !isField(err, "categoryId") {
		t.Fatalf("err = %v, want field categoryId", err)
	}
	var n int
	l.read.QueryRow("SELECT count(*) FROM entry_keys").Scan(&n)
	if n != 0 {
		t.Errorf("%d entry keys left", n)
	}
}

func TestDeleteTransactionRemovesKey(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	tr := mustTx(t, l, c, "2026-10-01", 1, Expense, "")
	ctx := context.Background()
	if err := l.DeleteTransaction(ctx, tr.ID); err != nil {
		t.Fatal(err)
	}
	if err := l.DeleteTransaction(ctx, tr.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("second delete = %v", err)
	}
	if _, err := l.Transaction(ctx, tr.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("get = %v", err)
	}
	var n int
	l.read.QueryRow("SELECT count(*) FROM entry_keys").Scan(&n)
	if n != 0 {
		t.Errorf("%d entry keys left", n)
	}
}

func TestUpdateTransaction(t *testing.T) {
	l := newLedger(t)
	a := mustCategory(t, l, "A").ID
	b := mustCategory(t, l, "B").ID
	tr := mustTx(t, l, a, "2026-10-01", 1, Expense, "")
	ctx := context.Background()
	got, err := l.UpdateTransaction(ctx, tr.ID, TransactionInput{Amount: 2.5, Type: Income, CategoryID: b, Date: "2025-02-28", Note: "n"})
	if err != nil {
		t.Fatal(err)
	}
	want := Transaction{ID: tr.ID, Amount: 2.5, Type: Income, CategoryID: b, Category: "B", Date: "2025-02-28", Note: "n"}
	if got != want {
		t.Errorf("= %+v, want %+v", got, want)
	}
	if _, err := l.UpdateTransaction(ctx, 999, TransactionInput{Amount: 1, Type: Income, CategoryID: b, Date: "2025-02-28"}); !errors.Is(err, ErrNotFound) {
		t.Errorf("missing id = %v", err)
	}
}

func TestTransactionValidation(t *testing.T) {
	l := newLedger(t)
	c := mustCategory(t, l, "X").ID
	ok := TransactionInput{Amount: 1, Type: Expense, CategoryID: c, Date: "2026-10-01"}
	cases := map[string]func(*TransactionInput){
		"amount":     func(in *TransactionInput) { in.Amount = 0 },
		"amount ":    func(in *TransactionInput) { in.Amount = 0.004 },
		"amount  ":   func(in *TransactionInput) { in.Amount = -1 },
		"amount   ":  func(in *TransactionInput) { in.Amount = 1_000_000_000.01 },
		"type":       func(in *TransactionInput) { in.Type = "gift" },
		"categoryId": func(in *TransactionInput) { in.CategoryID = 0 },
		"date":       func(in *TransactionInput) { in.Date = "2026-02-29" },
		"note":       func(in *TransactionInput) { in.Note = strings.Repeat("ä", 501) },
	}
	for field, mut := range cases {
		in := ok
		mut(&in)
		_, _, err := l.CreateTransaction(context.Background(), "key-"+strings.Repeat("x", 8), in)
		if !isField(err, strings.TrimSpace(field)) {
			t.Errorf("%s: err = %v", field, err)
		}
	}
	in := ok
	in.Amount = 1_000_000_000
	in.Note = strings.Repeat("ä", 500)
	if _, _, err := l.CreateTransaction(context.Background(), "key-maximum", in); err != nil {
		t.Errorf("limits: %v", err)
	}
	for _, key := range []string{"short", strings.Repeat("a", 65), "abc_defgh", "abcdefgh ä"} {
		if _, _, err := l.CreateTransaction(context.Background(), key, ok); !isField(err, "key") {
			t.Errorf("key %q: %v", key, err)
		}
	}
}

func TestCategories(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	a, err := l.CreateCategory(ctx, CategoryInput{Name: "  Bäcker ", HasNotes: true})
	if err != nil || a.Name != "Bäcker" || !a.HasNotes {
		t.Fatalf("create = %+v, %v", a, err)
	}
	if _, err := l.CreateCategory(ctx, CategoryInput{Name: "Bäcker"}); !errors.Is(err, ErrDuplicate) {
		t.Errorf("duplicate = %v", err)
	}
	if _, err := l.CreateCategory(ctx, CategoryInput{Name: "   "}); !isField(err, "name") {
		t.Errorf("empty name = %v", err)
	}
	b := mustCategory(t, l, "Mittag")
	if _, err := l.UpdateCategory(ctx, b.ID, CategoryInput{Name: "Bäcker"}); !errors.Is(err, ErrDuplicate) {
		t.Errorf("rename to taken = %v", err)
	}
	b2, err := l.UpdateCategory(ctx, b.ID, CategoryInput{Name: "Mittagessen", HasNotes: true})
	if err != nil || b2 != (Category{ID: b.ID, Name: "Mittagessen", HasNotes: true}) {
		t.Errorf("update = %+v, %v", b2, err)
	}
	if _, err := l.UpdateCategory(ctx, 99, CategoryInput{Name: "Z"}); !errors.Is(err, ErrNotFound) {
		t.Errorf("update missing = %v", err)
	}
	all, _ := l.Categories(ctx)
	if len(all) != 2 || all[0].ID != a.ID || all[1].ID != b.ID {
		t.Errorf("list = %+v", all)
	}
	if err := l.DeleteCategory(ctx, b.ID); err != nil {
		t.Errorf("delete unused = %v", err)
	}
	if err := l.DeleteCategory(ctx, b.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("delete again = %v", err)
	}
}

func TestDeleteCategoryRefusedWhenUsed(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	byTx := mustCategory(t, l, "A").ID
	byTemplate := mustCategory(t, l, "B").ID
	mustTx(t, l, byTx, "2026-10-01", 1, Expense, "")
	if _, err := l.CreateTemplate(ctx, TemplateInput{Type: Expense, CategoryID: byTemplate, Day: 1}); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int64{byTx, byTemplate} {
		if err := l.DeleteCategory(ctx, id); !errors.Is(err, ErrInUse) {
			t.Errorf("delete %d = %v, want ErrInUse", id, err)
		}
	}
	all, _ := l.Categories(ctx)
	if len(all) != 2 {
		t.Errorf("%d categories left", len(all))
	}
}

func TestTemplates(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	a := mustCategory(t, l, "A").ID
	b := mustCategory(t, l, "B").ID
	mk := func(cat int64, day int, amount float64) Template {
		tp, err := l.CreateTemplate(ctx, TemplateInput{Amount: amount, Type: Income, CategoryID: cat, Day: day, Note: "n"})
		if err != nil {
			t.Fatal(err)
		}
		return tp
	}
	t31 := mk(a, 31, 0)
	t5 := mk(b, 5, 3.333)
	t5b := mk(a, 5, 1)
	if t5.Amount != 3.33 || t31.Category != "A" || t31.Day != 31 {
		t.Errorf("created %+v %+v", t5, t31)
	}
	all, _ := l.Templates(ctx, 0)
	var got []int64
	for _, tp := range all {
		got = append(got, tp.ID)
	}
	if want := []int64{t5.ID, t5b.ID, t31.ID}; !reflect.DeepEqual(got, want) {
		t.Errorf("order = %v, want %v", got, want)
	}
	onlyA, _ := l.Templates(ctx, a)
	if len(onlyA) != 2 || onlyA[0].ID != t5b.ID {
		t.Errorf("filter = %+v", onlyA)
	}
	up, err := l.UpdateTemplate(ctx, t31.ID, TemplateInput{Amount: 7, Type: Expense, CategoryID: b, Day: 1})
	if err != nil || up.Category != "B" || up.Day != 1 || up.Note != "" {
		t.Errorf("update = %+v, %v", up, err)
	}
	for field, in := range map[string]TemplateInput{
		"amount":     {Amount: -0.01, Type: Expense, CategoryID: a, Day: 1},
		"day":        {Type: Expense, CategoryID: a, Day: 32},
		"categoryId": {Type: Expense, CategoryID: 77, Day: 1},
		"type":       {Type: "", CategoryID: a, Day: 1},
	} {
		if _, err := l.CreateTemplate(ctx, in); !isField(err, field) {
			t.Errorf("%s: %v", field, err)
		}
	}
	if err := l.DeleteTemplate(ctx, t5.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := l.Template(ctx, t5.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("get deleted = %v", err)
	}
}

func TestReviewGroupsByCalendarDay(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	a := mustCategory(t, l, "A").ID
	b := mustCategory(t, l, "B").ID
	mustTx(t, l, a, "2025-12-31", 1.111, Expense, "")
	mustTx(t, l, a, "2026-01-01", 10, Expense, "")
	mustTx(t, l, b, "2026-01-01", 100, Income, "")
	mustTx(t, l, a, "2026-01-31", 0.1, Expense, "")
	mustTx(t, l, a, "2026-01-31", 0.2, Expense, "")
	mustTx(t, l, b, "2026-02-01", 5, Expense, "")
	mustTx(t, l, b, "2026-12-31", 7, Income, "")

	years, err := l.ReviewYears(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if want := []YearSum{{2025, 0, 1.11}, {2026, 107, 15.3}}; !reflect.DeepEqual(years, want) {
		t.Errorf("years = %+v, want %+v", years, want)
	}
	years, _ = l.ReviewYears(ctx, []int64{b})
	if want := []YearSum{{2026, 107, 5}}; !reflect.DeepEqual(years, want) {
		t.Errorf("years of b = %+v, want %+v", years, want)
	}
	months, _ := l.ReviewMonths(ctx, 2026, nil)
	if want := []MonthSum{{1, 100, 10.3}, {2, 0, 5}, {12, 7, 0}}; !reflect.DeepEqual(months, want) {
		t.Errorf("months = %+v, want %+v", months, want)
	}
	months, _ = l.ReviewMonths(ctx, 2026, []int64{a})
	if want := []MonthSum{{1, 0, 10.3}}; !reflect.DeepEqual(months, want) {
		t.Errorf("months of a = %+v, want %+v", months, want)
	}
	cats, _ := l.ReviewCategories(ctx, 2026, 1)
	if want := []CategorySum{{a, "A", 0, 10.3}, {b, "B", 100, 0}}; !reflect.DeepEqual(cats, want) {
		t.Errorf("categories = %+v, want %+v", cats, want)
	}
	empty, _ := l.ReviewCategories(ctx, 2026, 3)
	if empty == nil || len(empty) != 0 {
		t.Errorf("empty month = %#v, want []", empty)
	}
}

func TestReviewGridByMonthAndByYear(t *testing.T) {
	l := newLedger(t)
	ctx := context.Background()
	a := mustCategory(t, l, "A").ID
	b := mustCategory(t, l, "B").ID
	mustTx(t, l, a, "2025-12-31", 1.111, Expense, "")
	mustTx(t, l, a, "2026-01-01", 10, Expense, "")
	mustTx(t, l, a, "2026-01-31", 0.2, Expense, "")
	mustTx(t, l, b, "2026-01-15", 100, Income, "")
	mustTx(t, l, b, "2026-03-01", 5, Expense, "")

	months, err := l.ReviewGrid(ctx, 2026)
	if err != nil {
		t.Fatal(err)
	}
	if want := []CategoryPeriod{{1, a, "A", 0, 10.2}, {1, b, "B", 100, 0}, {3, b, "B", 0, 5}}; !reflect.DeepEqual(months, want) {
		t.Errorf("2026 = %+v, want %+v", months, want)
	}
	years, _ := l.ReviewGrid(ctx, 0)
	if want := []CategoryPeriod{{2025, a, "A", 0, 1.11}, {2026, a, "A", 0, 10.2}, {2026, b, "B", 100, 5}}; !reflect.DeepEqual(years, want) {
		t.Errorf("years = %+v, want %+v", years, want)
	}
	empty, _ := l.ReviewGrid(ctx, 2020)
	if empty == nil || len(empty) != 0 {
		t.Errorf("empty year = %#v, want []", empty)
	}
}
