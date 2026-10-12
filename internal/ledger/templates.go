package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Template is a prepared transaction for a day of the month.
type Template struct {
	ID         int64   `json:"id"`
	Amount     float64 `json:"amount"`
	Type       Type    `json:"type"`
	CategoryID int64   `json:"categoryId"`
	Category   string  `json:"category"`
	Day        int     `json:"day"`
	Note       string  `json:"note"`
}

// TemplateInput is what a client sends to create or change a template.
type TemplateInput struct {
	Amount     float64 `json:"amount"`
	Type       Type    `json:"type"`
	CategoryID int64   `json:"categoryId"`
	Day        int     `json:"day"`
	Note       string  `json:"note"`
}

func (in TemplateInput) valid() (TemplateInput, error) {
	var err error
	if in.Amount, err = validAmount(in.Amount, true); err != nil {
		return in, err
	}
	if err := validType(in.Type); err != nil {
		return in, err
	}
	if in.CategoryID <= 0 {
		return in, invalid("categoryId")
	}
	if in.Day < 1 || in.Day > 31 {
		return in, invalid("day")
	}
	if in.Note, err = validText(in.Note, "note", false); err != nil {
		return in, err
	}
	return in, nil
}

const templateSelect = `
SELECT t.id, t.amount, t.type, t.category_id, c.name, t.day, t.note
FROM templates t JOIN categories c ON c.id = t.category_id`

func scanTemplate(s interface{ Scan(...any) error }) (Template, error) {
	var t Template
	err := s.Scan(&t.ID, &t.Amount, &t.Type, &t.CategoryID, &t.Category, &t.Day, &t.Note)
	return t, err
}

// Templates returns the templates ordered by day, then id. A categoryID
// above 0 keeps only that category's templates.
func (l *Ledger) Templates(ctx context.Context, categoryID int64) ([]Template, error) {
	query, args := templateSelect, []any{}
	if categoryID > 0 {
		query += " WHERE t.category_id = ?"
		args = append(args, categoryID)
	}
	rows, err := l.read.QueryContext(ctx, query+" ORDER BY t.day, t.id", args...)
	if err != nil {
		return nil, fmt.Errorf("ledger: templates: %w", err)
	}
	defer rows.Close()
	out := []Template{}
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			return nil, fmt.Errorf("ledger: templates: %w", err)
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ledger: templates: %w", err)
	}
	return out, nil
}

// Template returns template id, or ErrNotFound.
func (l *Ledger) Template(ctx context.Context, id int64) (Template, error) {
	return template(ctx, l.read, id)
}

func template(ctx context.Context, q queryRower, id int64) (Template, error) {
	t, err := scanTemplate(q.QueryRowContext(ctx, templateSelect+" WHERE t.id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrNotFound
	}
	if err != nil {
		return t, fmt.Errorf("ledger: template %d: %w", id, err)
	}
	return t, nil
}

// CreateTemplate adds a template.
func (l *Ledger) CreateTemplate(ctx context.Context, in TemplateInput) (Template, error) {
	in, err := in.valid()
	if err != nil {
		return Template{}, err
	}
	var t Template
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx,
			`INSERT INTO templates (amount, type, category_id, day, note) VALUES (?, ?, ?, ?, ?)`,
			in.Amount, in.Type, in.CategoryID, in.Day, in.Note)
		if err != nil {
			return categoryRefError(err, "create template")
		}
		id, err := res.LastInsertId()
		if err != nil {
			return fmt.Errorf("ledger: create template: %w", err)
		}
		t, err = template(ctx, tx, id)
		return err
	})
	return t, err
}

// UpdateTemplate changes template id.
func (l *Ledger) UpdateTemplate(ctx context.Context, id int64, in TemplateInput) (Template, error) {
	in, err := in.valid()
	if err != nil {
		return Template{}, err
	}
	var t Template
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx,
			`UPDATE templates SET amount = ?, type = ?, category_id = ?, day = ?, note = ? WHERE id = ?`,
			in.Amount, in.Type, in.CategoryID, in.Day, in.Note, id)
		if err != nil {
			return categoryRefError(err, "update template")
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		t, err = template(ctx, tx, id)
		return err
	})
	return t, err
}

// DeleteTemplate removes template id.
func (l *Ledger) DeleteTemplate(ctx context.Context, id int64) error {
	return l.deleteRow(ctx, "templates", id)
}
