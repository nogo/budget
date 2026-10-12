// Package ledger is one ledger file: its schema, opening it, and every query
// the app runs on it (transactions, search, categories, templates, review,
// entry keys). Reach for it whenever data is read or written; nothing else
// talks SQL to a ledger file.
package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/mattn/go-sqlite3"
)

// Version is the schema version kept in PRAGMA user_version.
const Version = 1

// Schema creates an empty ledger. It is the schema of docs/api.md.
const Schema = `
CREATE TABLE categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  has_notes INTEGER NOT NULL DEFAULT 0 CHECK (has_notes IN (0, 1))
);
CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK (amount > 0),
  type        TEXT    NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  date        INTEGER NOT NULL CHECK (date % 86400 = 0),  -- midnight UTC of the day
  note        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX transactions_date_idx ON transactions (date);
CREATE INDEX transactions_category_idx ON transactions (category_id);
CREATE TABLE templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK (amount >= 0),
  type        TEXT    NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  day         INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  note        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX templates_category_idx ON templates (category_id);
CREATE TABLE entry_keys (
  key            TEXT    PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  created_at     INTEGER NOT NULL
);
PRAGMA user_version = 1;
`

// DriverName is the database/sql driver every ledger connection uses. It sets
// WAL, foreign keys and the busy timeout on each new connection and provides
// unicode_lower(text), which SQLite's own lower() lacks for umlauts.
const DriverName = "sqlite3-ledger"

func init() {
	sql.Register(DriverName, &sqlite3.SQLiteDriver{ConnectHook: func(c *sqlite3.SQLiteConn) error {
		for _, p := range []string{"PRAGMA busy_timeout = 5000", "PRAGMA foreign_keys = ON", "PRAGMA journal_mode = WAL"} {
			if _, err := c.Exec(p, nil); err != nil {
				return fmt.Errorf("ledger: %s: %w", p, err)
			}
		}
		return c.RegisterFunc("unicode_lower", strings.ToLower, true)
	}})
}

var (
	// ErrInvalid marks input that breaks a validation rule; see FieldError.
	ErrInvalid = errors.New("ledger: invalid input")
	// ErrNotFound marks an id that does not exist.
	ErrNotFound = errors.New("ledger: not found")
	// ErrDuplicate marks a category name that is already taken.
	ErrDuplicate = errors.New("ledger: duplicate name")
	// ErrInUse marks a category still used by a transaction or template.
	ErrInUse = errors.New("ledger: category in use")
	// ErrVersion marks a file whose schema version this program does not know.
	ErrVersion = errors.New("ledger: unknown schema version")
)

// FieldError names the one input field that broke a rule. It matches
// ErrInvalid with errors.Is.
type FieldError struct {
	Field string
}

func (e *FieldError) Error() string { return "ledger: invalid " + e.Field }

// Unwrap lets errors.Is(err, ErrInvalid) match.
func (e *FieldError) Unwrap() error { return ErrInvalid }

func invalid(field string) error { return &FieldError{Field: field} }

// Ledger is one open ledger file: a single writing connection and a pool of
// reading connections.
type Ledger struct {
	path  string
	write *sql.DB
	read  *sql.DB
}

// DSN returns the data source name for path. mode is "rw", "ro" or "rwc".
// Callers outside this package use it with DriverName, e.g. the importer.
func DSN(path, mode string, extra ...string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("ledger: %w", err)
	}
	u := url.URL{Scheme: "file", Path: abs}
	q := "mode=" + mode
	for _, e := range extra {
		q += "&" + e
	}
	return u.String() + "?" + q, nil
}

// Open opens the ledger file at path. It refuses a missing file and a file
// whose user_version is not Version.
func Open(path string) (*Ledger, error) {
	if _, err := os.Stat(path); err != nil {
		return nil, fmt.Errorf("ledger: %w", err)
	}
	wdsn, err := DSN(path, "rw", "_txlock=immediate")
	if err != nil {
		return nil, err
	}
	rdsn, err := DSN(path, "ro")
	if err != nil {
		return nil, err
	}
	w, err := sql.Open(DriverName, wdsn)
	if err != nil {
		return nil, fmt.Errorf("ledger: %s: %w", path, err)
	}
	w.SetMaxOpenConns(1)
	w.SetMaxIdleConns(1)
	w.SetConnMaxLifetime(0)
	w.SetConnMaxIdleTime(0)
	var v int
	if err := w.QueryRow("PRAGMA user_version").Scan(&v); err != nil {
		w.Close()
		return nil, fmt.Errorf("ledger: %s: %w", path, err)
	}
	if v != Version {
		w.Close()
		return nil, fmt.Errorf("%w: %s has %d, want %d", ErrVersion, path, v, Version)
	}
	r, err := sql.Open(DriverName, rdsn)
	if err != nil {
		w.Close()
		return nil, fmt.Errorf("ledger: %s: %w", path, err)
	}
	r.SetMaxOpenConns(8)
	if err := r.Ping(); err != nil {
		w.Close()
		r.Close()
		return nil, fmt.Errorf("ledger: %s: %w", path, err)
	}
	return &Ledger{path: path, write: w, read: r}, nil
}

// Create makes a new, empty ledger file at path. It refuses an existing file.
func Create(path string) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("ledger: %w", err)
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("ledger: %w", err)
	}
	dsn, err := DSN(path, "rw")
	if err != nil {
		return err
	}
	db, err := sql.Open(DriverName, dsn)
	if err != nil {
		os.Remove(path)
		return fmt.Errorf("ledger: %s: %w", path, err)
	}
	_, err = db.Exec(Schema)
	if cerr := db.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(path)
		return fmt.Errorf("ledger: create %s: %w", path, err)
	}
	return nil
}

// Path returns the file the ledger was opened from.
func (l *Ledger) Path() string { return l.path }

// Close closes both connection pools.
func (l *Ledger) Close() error {
	return errors.Join(l.read.Close(), l.write.Close())
}

// inTx runs fn in one immediate write transaction and commits when fn returns nil.
func (l *Ledger) inTx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := l.write.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ledger: begin: %w", err)
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("ledger: commit: %w", err)
	}
	return nil
}

// constraint reports the extended SQLite constraint code of err, or 0.
func constraint(err error) sqlite3.ErrNoExtended {
	var se sqlite3.Error
	if errors.As(err, &se) && se.Code == sqlite3.ErrConstraint {
		return se.ExtendedCode
	}
	return 0
}

// Backup writes a consistent copy of the ledger to target, which must not
// exist. It is safe while the server writes: SQLite copies one snapshot. A
// plain file copy is not, because WAL mode keeps recent writes in -wal.
func (l *Ledger) Backup(ctx context.Context, target string) error {
	if _, err := os.Stat(target); err == nil {
		return fmt.Errorf("ledger: backup target %s exists", target)
	}
	if _, err := l.read.ExecContext(ctx, "VACUUM INTO ?", target); err != nil {
		return fmt.Errorf("ledger: backup %s: %w", l.path, err)
	}
	return nil
}
