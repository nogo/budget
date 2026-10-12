package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mattn/go-sqlite3"
)

// Transaction is one expense or income on one day.
type Transaction struct {
	ID         int64   `json:"id"`
	Amount     float64 `json:"amount"`
	Type       Type    `json:"type"`
	CategoryID int64   `json:"categoryId"`
	Category   string  `json:"category"`
	Date       string  `json:"date"` // YYYY-MM-DD
	Note       string  `json:"note"`
}

// TransactionInput is what a client sends to create or change a transaction.
type TransactionInput struct {
	Amount     float64 `json:"amount"`
	Type       Type    `json:"type"`
	CategoryID int64   `json:"categoryId"`
	Date       string  `json:"date"`
	Note       string  `json:"note"`
}

type validTransaction struct {
	TransactionInput
	unix int64
}

func (in TransactionInput) valid() (validTransaction, error) {
	var v validTransaction
	var err error
	if in.Amount, err = validAmount(in.Amount, false); err != nil {
		return v, err
	}
	if err := validType(in.Type); err != nil {
		return v, err
	}
	if in.CategoryID <= 0 {
		return v, invalid("categoryId")
	}
	unix, ok := ParseDate(in.Date)
	if !ok {
		return v, invalid("date")
	}
	if in.Note, err = validText(in.Note, "note", false); err != nil {
		return v, err
	}
	return validTransaction{in, unix}, nil
}

const transactionSelect = `
SELECT t.id, t.amount, t.type, t.category_id, c.name, t.date, t.note
FROM transactions t JOIN categories c ON c.id = t.category_id`

func scanTransaction(s interface{ Scan(...any) error }) (Transaction, error) {
	var t Transaction
	var date int64
	err := s.Scan(&t.ID, &t.Amount, &t.Type, &t.CategoryID, &t.Category, &date, &t.Note)
	t.Date = FormatDate(date)
	return t, err
}

// Transactions returns the transactions of month ("YYYY-MM") that match the
// search q, newest date first, then highest id first. See Search for q; with
// text words in q, every month is searched and month may be empty.
func (l *Ledger) Transactions(ctx context.Context, month, q string) ([]Transaction, error) {
	s := ParseSearch(q)
	where, args := []string{}, []any{}
	if len(s.Words) == 0 {
		from, to, ok := ParseMonth(month)
		if !ok {
			return nil, invalid("month")
		}
		where = append(where, "t.date >= ? AND t.date < ?")
		args = append(args, from, to)
	}
	for _, w := range s.Words {
		where = append(where, "instr(unicode_lower(t.note), ?) > 0")
		args = append(args, w)
	}
	if len(s.Categories) > 0 {
		var ors []string
		for _, c := range s.Categories {
			ors = append(ors, "instr(unicode_lower(c.name), ?) > 0")
			args = append(args, c)
		}
		where = append(where, "("+strings.Join(ors, " OR ")+")")
	}
	if len(s.Cents) > 0 {
		where = append(where, "CAST(round(t.amount * 100) AS INTEGER) IN (?"+strings.Repeat(", ?", len(s.Cents)-1)+")")
		for _, c := range s.Cents {
			args = append(args, c)
		}
	}
	query := transactionSelect
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += " ORDER BY t.date DESC, t.id DESC"
	rows, err := l.read.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ledger: transactions: %w", err)
	}
	defer rows.Close()
	out := []Transaction{}
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, fmt.Errorf("ledger: transactions: %w", err)
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ledger: transactions: %w", err)
	}
	return out, nil
}

// Transaction returns transaction id, or ErrNotFound.
func (l *Ledger) Transaction(ctx context.Context, id int64) (Transaction, error) {
	return transaction(ctx, l.read, id)
}

func transaction(ctx context.Context, q queryRower, id int64) (Transaction, error) {
	t, err := scanTransaction(q.QueryRowContext(ctx, transactionSelect+" WHERE t.id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrNotFound
	}
	if err != nil {
		return t, fmt.Errorf("ledger: transaction %d: %w", id, err)
	}
	return t, nil
}

// ValidKey reports whether key may serve as an entry key: 8 to 64
// characters of [A-Za-z0-9-].
func ValidKey(key string) bool { return keyPattern.MatchString(key) }

// CreateTransaction saves a new transaction together with its entry key, in
// one SQL transaction. For a key it has seen before it saves nothing and
// returns the stored transaction with created false, so a resent entry is
// saved once.
func (l *Ledger) CreateTransaction(ctx context.Context, key string, in TransactionInput) (t Transaction, created bool, err error) {
	if !ValidKey(key) {
		return t, false, invalid("key")
	}
	v, err := in.valid()
	if err != nil {
		return t, false, err
	}
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		var known int64
		err := tx.QueryRowContext(ctx, `SELECT transaction_id FROM entry_keys WHERE key = ?`, key).Scan(&known)
		if err == nil {
			t, err = transaction(ctx, tx, known)
			return err
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("ledger: entry key: %w", err)
		}
		res, err := tx.ExecContext(ctx,
			`INSERT INTO transactions (amount, type, category_id, date, note) VALUES (?, ?, ?, ?, ?)`,
			v.Amount, v.Type, v.CategoryID, v.unix, v.Note)
		if err != nil {
			return categoryRefError(err, "create transaction")
		}
		id, err := res.LastInsertId()
		if err != nil {
			return fmt.Errorf("ledger: create transaction: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO entry_keys (key, transaction_id, created_at) VALUES (?, ?, ?)`,
			key, id, time.Now().Unix()); err != nil {
			return fmt.Errorf("ledger: entry key: %w", err)
		}
		created = true
		t, err = transaction(ctx, tx, id)
		return err
	})
	if err != nil {
		return Transaction{}, false, err
	}
	return t, created, nil
}

// UpdateTransaction changes transaction id.
func (l *Ledger) UpdateTransaction(ctx context.Context, id int64, in TransactionInput) (Transaction, error) {
	v, err := in.valid()
	if err != nil {
		return Transaction{}, err
	}
	var t Transaction
	err = l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx,
			`UPDATE transactions SET amount = ?, type = ?, category_id = ?, date = ?, note = ? WHERE id = ?`,
			v.Amount, v.Type, v.CategoryID, v.unix, v.Note, id)
		if err != nil {
			return categoryRefError(err, "update transaction")
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		t, err = transaction(ctx, tx, id)
		return err
	})
	return t, err
}

// DeleteTransaction removes transaction id and its entry key.
func (l *Ledger) DeleteTransaction(ctx context.Context, id int64) error {
	return l.deleteRow(ctx, "transactions", id)
}

func (l *Ledger) deleteRow(ctx context.Context, table string, id int64) error {
	return l.inTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `DELETE FROM `+table+` WHERE id = ?`, id)
		if err != nil {
			return fmt.Errorf("ledger: delete %s %d: %w", table, id, err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return nil
	})
}

// categoryRefError turns a foreign key failure on category_id into a field error.
func categoryRefError(err error, op string) error {
	if constraint(err) == sqlite3.ErrConstraintForeignKey {
		return invalid("categoryId")
	}
	return fmt.Errorf("ledger: %s: %w", op, err)
}
