package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/mattn/go-sqlite3"
)

// Category groups transactions and templates. HasNotes switches the note
// field on in the form.
type Category struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	HasNotes bool   `json:"hasNotes"`
}

// CategoryInput is what a client sends to create or change a category.
type CategoryInput struct {
	Name     string `json:"name"`
	HasNotes bool   `json:"hasNotes"`
}

func (in CategoryInput) valid() (CategoryInput, error) {
	name, err := validText(in.Name, "name", true)
	if err != nil {
		return in, err
	}
	in.Name = name
	return in, nil
}

// Categories returns every category, ordered by id.
func (l *Ledger) Categories(ctx context.Context) ([]Category, error) {
	rows, err := l.read.QueryContext(ctx, `SELECT id, name, has_notes FROM categories ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("ledger: categories: %w", err)
	}
	defer rows.Close()
	out := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.HasNotes); err != nil {
			return nil, fmt.Errorf("ledger: categories: %w", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ledger: categories: %w", err)
	}
	return out, nil
}

// Category returns category id, or ErrNotFound.
func (l *Ledger) Category(ctx context.Context, id int64) (Category, error) {
	return category(ctx, l.read, id)
}

type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func category(ctx context.Context, q queryRower, id int64) (Category, error) {
	var c Category
	err := q.QueryRowContext(ctx, `SELECT id, name, has_notes FROM categories WHERE id = ?`, id).
		Scan(&c.ID, &c.Name, &c.HasNotes)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	if err != nil {
		return c, fmt.Errorf("ledger: category %d: %w", id, err)
	}
	return c, nil
}

// CreateCategory adds a category. A taken name gives ErrDuplicate.
func (l *Ledger) CreateCategory(ctx context.Context, in CategoryInput) (Category, error) {
	in, err := in.valid()
	if err != nil {
		return Category{}, err
	}
	var c Category
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `INSERT INTO categories (name, has_notes) VALUES (?, ?)`, in.Name, in.HasNotes)
		if err != nil {
			return categoryWriteError(err)
		}
		id, err := res.LastInsertId()
		if err != nil {
			return fmt.Errorf("ledger: create category: %w", err)
		}
		c, err = category(ctx, tx, id)
		return err
	})
	return c, err
}

// UpdateCategory changes category id. A taken name gives ErrDuplicate.
func (l *Ledger) UpdateCategory(ctx context.Context, id int64, in CategoryInput) (Category, error) {
	in, err := in.valid()
	if err != nil {
		return Category{}, err
	}
	var c Category
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `UPDATE categories SET name = ?, has_notes = ? WHERE id = ?`, in.Name, in.HasNotes, id)
		if err != nil {
			return categoryWriteError(err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		c, err = category(ctx, tx, id)
		return err
	})
	return c, err
}

// DeleteCategory removes category id. A category still used by a
// transaction or template gives ErrInUse.
func (l *Ledger) DeleteCategory(ctx context.Context, id int64) error {
	return l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `DELETE FROM categories WHERE id = ?`, id)
		// SQLite reports ON DELETE RESTRICT as a trigger constraint.
		if c := constraint(err); c == sqlite3.ErrConstraintForeignKey || c == sqlite3.ErrConstraintTrigger {
			return ErrInUse
		}
		if err != nil {
			return fmt.Errorf("ledger: delete category %d: %w", id, err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func categoryWriteError(err error) error {
	if constraint(err) == sqlite3.ErrConstraintUnique {
		return ErrDuplicate
	}
	return fmt.Errorf("ledger: write category: %w", err)
}
