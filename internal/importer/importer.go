// Package importer turns a database of the old TanStack app into a clean
// ledger file. Reach for it once per ledger when moving to the Go app; it
// never changes the old file.
package importer

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"time"
	_ "time/tzdata" // Europe/Berlin must not depend on the host's zone files

	_ "github.com/mattn/go-sqlite3" // the old file is read with the plain driver, which sets no pragmas

	"github.com/nogo/budget/internal/ledger"
)

// Counts says how many rows the import carried over. Restored counts the
// categories it had to recreate: the old app never enforced foreign keys,
// so a deleted category could leave transactions pointing at nothing.
type Counts struct {
	Categories, Transactions, Templates int
	Restored                            int
}

// ErrMismatch marks an import whose written file disagrees with the old one.
var ErrMismatch = errors.New("importer: old and new data differ")

// Import reads the old database at oldPath read-only and writes a new ledger
// file at newPath. It keeps every id, moves each date to midnight UTC of its
// Europe/Berlin calendar day, and then checks count and sum per day and type
// against the old file. On any error nothing is left at newPath.
func Import(ctx context.Context, oldPath, newPath string) (Counts, error) {
	var c Counts
	berlin, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		return c, fmt.Errorf("importer: %w", err)
	}
	if _, err := os.Stat(oldPath); err != nil {
		return c, fmt.Errorf("importer: %w", err)
	}
	if _, err := os.Lstat(newPath); err == nil {
		return c, fmt.Errorf("importer: %s already exists", newPath)
	} else if !errors.Is(err, os.ErrNotExist) {
		return c, fmt.Errorf("importer: %w", err)
	}

	dsn, err := ledger.DSN(oldPath, "ro")
	if err != nil {
		return c, err
	}
	old, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return c, fmt.Errorf("importer: %s: %w", oldPath, err)
	}
	defer old.Close()

	tmp, err := tempPath(newPath)
	if err != nil {
		return c, err
	}
	if err := ledger.Create(tmp); err != nil {
		return c, err
	}
	ok := false
	defer func() {
		if !ok {
			removeDB(tmp)
		}
	}()

	if c, err = copyRows(ctx, old, tmp, berlin); err != nil {
		return c, err
	}
	if err := verify(ctx, old, tmp, berlin, c); err != nil {
		return c, err
	}
	// Open checks the schema version the way the server will.
	l, err := ledger.Open(tmp)
	if err != nil {
		return c, err
	}
	if err := l.Close(); err != nil {
		return c, fmt.Errorf("importer: %w", err)
	}
	// Link refuses an existing target, unlike rename; rename is the fallback
	// for file systems without hard links.
	if err := os.Link(tmp, newPath); err != nil {
		if _, serr := os.Lstat(newPath); serr == nil {
			return c, fmt.Errorf("importer: %s already exists", newPath)
		}
		if err := os.Rename(tmp, newPath); err != nil {
			return c, fmt.Errorf("importer: %w", err)
		}
	}
	ok = true
	removeDB(tmp)
	return c, nil
}

// tempPath names a free file beside target, so the final step is a rename
// within one directory.
func tempPath(target string) (string, error) {
	f, err := os.CreateTemp(filepath.Dir(target), "."+filepath.Base(target)+".*.tmp")
	if err != nil {
		return "", fmt.Errorf("importer: %w", err)
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return name, nil
}

func removeDB(path string) {
	for _, suffix := range []string{"", "-wal", "-shm", "-journal"} {
		os.Remove(path + suffix)
	}
}

// BerlinDay returns midnight UTC of the Europe/Berlin calendar day of unix.
func BerlinDay(unix int64, berlin *time.Location) int64 {
	y, m, d := time.Unix(unix, 0).In(berlin).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Unix()
}

func copyRows(ctx context.Context, old *sql.DB, path string, berlin *time.Location) (Counts, error) {
	var c Counts
	dsn, err := ledger.DSN(path, "rw")
	if err != nil {
		return c, err
	}
	db, err := sql.Open(ledger.DriverName, dsn)
	if err != nil {
		return c, fmt.Errorf("importer: %w", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return c, fmt.Errorf("importer: %w", err)
	}
	defer tx.Rollback()

	steps := []struct {
		table  string
		query  string
		insert string
		count  *int
		row    func(scan func(...any) error) ([]any, error)
	}{
		{"categories", `SELECT id, name, has_notes FROM categories ORDER BY id`,
			`INSERT INTO categories (id, name, has_notes) VALUES (?, ?, ?)`, &c.Categories,
			func(scan func(...any) error) ([]any, error) {
				var id int64
				var name string
				var notes bool
				err := scan(&id, &name, &notes)
				return []any{id, name, notes}, err
			}},
		{"transactions", `SELECT id, amount, type, category_id, date, note FROM transactions ORDER BY id`,
			`INSERT INTO transactions (id, amount, type, category_id, date, note) VALUES (?, ?, ?, ?, ?, ?)`, &c.Transactions,
			func(scan func(...any) error) ([]any, error) {
				var id, cat, date int64
				var amount float64
				var typ, note string
				err := scan(&id, &amount, &typ, &cat, &date, &note)
				return []any{id, cents(amount), typ, cat, BerlinDay(date, berlin), note}, err
			}},
		{"templates", `SELECT id, amount, type, category_id, day, note FROM templates ORDER BY id`,
			`INSERT INTO templates (id, amount, type, category_id, day, note) VALUES (?, ?, ?, ?, ?, ?)`, &c.Templates,
			func(scan func(...any) error) ([]any, error) {
				var id, cat, day int64
				var amount float64
				var typ, note string
				err := scan(&id, &amount, &typ, &cat, &day, &note)
				return []any{id, cents(amount), typ, cat, day, note}, err
			}},
	}
	for _, s := range steps {
		if err := copyTable(ctx, old, tx, s.query, s.insert, s.count, s.row); err != nil {
			return c, fmt.Errorf("importer: %s: %w", s.table, err)
		}
		if s.table == "categories" {
			n, err := restoreCategories(ctx, old, tx)
			if err != nil {
				return c, err
			}
			c.Restored = n
		}
	}
	// Carry the AUTOINCREMENT counters over, so a deleted old id is never reused.
	if err := copySequence(ctx, old, tx); err != nil {
		return c, err
	}
	if err := tx.Commit(); err != nil {
		return c, fmt.Errorf("importer: commit: %w", err)
	}
	return c, nil
}

// restoreCategories recreates every category id that transactions or
// templates still use but the old file no longer has, named "Unbekannt <id>"
// so the family can find and rename it. Nothing is dropped.
func restoreCategories(ctx context.Context, old *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := old.QueryContext(ctx, `
		SELECT category_id FROM transactions WHERE category_id NOT IN (SELECT id FROM categories)
		UNION
		SELECT category_id FROM templates WHERE category_id NOT IN (SELECT id FROM categories)
		ORDER BY 1`)
	if err != nil {
		return 0, fmt.Errorf("importer: missing categories: %w", err)
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, fmt.Errorf("importer: missing categories: %w", err)
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("importer: missing categories: %w", err)
	}
	for _, id := range ids {
		if _, err := tx.ExecContext(ctx, `INSERT INTO categories (id, name, has_notes) VALUES (?, ?, 1)`, id, fmt.Sprintf("Unbekannt %d", id)); err != nil {
			return 0, fmt.Errorf("importer: restore category %d: %w", id, err)
		}
	}
	return len(ids), nil
}

func copyTable(ctx context.Context, old *sql.DB, tx *sql.Tx, query, insert string, count *int, row func(func(...any) error) ([]any, error)) error {
	rows, err := old.QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()
	stmt, err := tx.PrepareContext(ctx, insert)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for rows.Next() {
		args, err := row(rows.Scan)
		if err != nil {
			return err
		}
		if _, err := stmt.ExecContext(ctx, args...); err != nil {
			return fmt.Errorf("id %v: %w", args[0], err)
		}
		*count++
	}
	return rows.Err()
}

func copySequence(ctx context.Context, old *sql.DB, tx *sql.Tx) error {
	rows, err := old.QueryContext(ctx, `SELECT name, seq FROM sqlite_sequence WHERE name IN ('categories', 'transactions', 'templates')`)
	if err != nil {
		return fmt.Errorf("importer: sqlite_sequence: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		var seq int64
		if err := rows.Scan(&name, &seq); err != nil {
			return fmt.Errorf("importer: sqlite_sequence: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `UPDATE sqlite_sequence SET seq = max(seq, ?) WHERE name = ?`, seq, name); err != nil {
			return fmt.Errorf("importer: sqlite_sequence: %w", err)
		}
	}
	return rows.Err()
}

func cents(a float64) float64 { return math.Round(a*100) / 100 }

type dayKey struct {
	day string // YYYY-MM-DD
	typ string
}

type daySum struct {
	count int
	cents int64
}

// verify compares count and sum per day and type: the old file grouped by
// Berlin day in Go, the new file grouped by its stored UTC day in SQL.
func verify(ctx context.Context, old *sql.DB, path string, berlin *time.Location, c Counts) error {
	want := map[dayKey]daySum{}
	rows, err := old.QueryContext(ctx, `SELECT date, type, amount FROM transactions`)
	if err != nil {
		return fmt.Errorf("importer: verify: %w", err)
	}
	for rows.Next() {
		var date int64
		var typ string
		var amount float64
		if err := rows.Scan(&date, &typ, &amount); err != nil {
			rows.Close()
			return fmt.Errorf("importer: verify: %w", err)
		}
		k := dayKey{time.Unix(date, 0).In(berlin).Format("2006-01-02"), typ}
		s := want[k]
		s.count++
		s.cents += int64(math.Round(amount * 100))
		want[k] = s
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("importer: verify: %w", err)
	}

	dsn, err := ledger.DSN(path, "ro")
	if err != nil {
		return err
	}
	db, err := sql.Open(ledger.DriverName, dsn)
	if err != nil {
		return fmt.Errorf("importer: verify: %w", err)
	}
	defer db.Close()
	got := map[dayKey]daySum{}
	rows, err = db.QueryContext(ctx, `
SELECT date(date, 'unixepoch'), type, count(*), sum(CAST(round(amount * 100) AS INTEGER)), sum(date % 86400 != 0)
FROM transactions GROUP BY 1, 2`)
	if err != nil {
		return fmt.Errorf("importer: verify: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var k dayKey
		var s daySum
		var offDay int
		if err := rows.Scan(&k.day, &k.typ, &s.count, &s.cents, &offDay); err != nil {
			return fmt.Errorf("importer: verify: %w", err)
		}
		if offDay != 0 {
			return fmt.Errorf("%w: %d rows on %s are not at midnight UTC", ErrMismatch, offDay, k.day)
		}
		got[k] = s
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("importer: verify: %w", err)
	}
	for k, w := range want {
		if g := got[k]; g != w {
			return fmt.Errorf("%w: %s %s: old %d rows %d cents, new %d rows %d cents", ErrMismatch, k.day, k.typ, w.count, w.cents, g.count, g.cents)
		}
	}
	for k, g := range got {
		if _, ok := want[k]; !ok {
			return fmt.Errorf("%w: %s %s: %d rows only in the new file", ErrMismatch, k.day, k.typ, g.count)
		}
	}
	for table, n := range map[string]int{"categories": c.Categories, "templates": c.Templates, "transactions": c.Transactions} {
		var oldN, newN int
		if err := old.QueryRowContext(ctx, `SELECT count(*) FROM `+table).Scan(&oldN); err != nil {
			return fmt.Errorf("importer: verify: %w", err)
		}
		if err := db.QueryRowContext(ctx, `SELECT count(*) FROM `+table).Scan(&newN); err != nil {
			return fmt.Errorf("importer: verify: %w", err)
		}
		extra := 0
		if table == "categories" {
			extra = c.Restored
		}
		if oldN != n || newN != n+extra {
			return fmt.Errorf("%w: %s: old %d, new %d, copied %d, restored %d", ErrMismatch, table, oldN, newN, n, extra)
		}
	}
	return nil
}
