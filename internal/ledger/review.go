package ledger

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// YearSum is income and expense of one year.
type YearSum struct {
	Year    int     `json:"year"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// MonthSum is income and expense of one month; Month is 1 to 12.
type MonthSum struct {
	Month   int     `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// CategorySum is income and expense of one category in one month.
type CategorySum struct {
	CategoryID int64   `json:"categoryId"`
	Category   string  `json:"category"`
	Income     float64 `json:"income"`
	Expense    float64 `json:"expense"`
}

const sums = `
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END),
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)`

// categoryFilter returns an " AND category_id IN (...)" clause for ids, or "".
func categoryFilter(ids []int64, args []any) (string, []any) {
	if len(ids) == 0 {
		return "", args
	}
	for _, id := range ids {
		args = append(args, id)
	}
	return " AND t.category_id IN (?" + strings.Repeat(", ?", len(ids)-1) + ")", args
}

// ReviewYears returns income and expense per year, oldest first. Non-empty
// categories keeps only those categories.
func (l *Ledger) ReviewYears(ctx context.Context, categories []int64) ([]YearSum, error) {
	filter, args := categoryFilter(categories, nil)
	rows, err := l.read.QueryContext(ctx, `
SELECT CAST(strftime('%Y', t.date, 'unixepoch') AS INTEGER) AS year,`+sums+`
FROM transactions t WHERE 1`+filter+`
GROUP BY year ORDER BY year`, args...)
	if err != nil {
		return nil, fmt.Errorf("ledger: review years: %w", err)
	}
	defer rows.Close()
	out := []YearSum{}
	for rows.Next() {
		var s YearSum
		if err := rows.Scan(&s.Year, &s.Income, &s.Expense); err != nil {
			return nil, fmt.Errorf("ledger: review years: %w", err)
		}
		s.Income, s.Expense = cents(s.Income), cents(s.Expense)
		out = append(out, s)
	}
	return out, rows.Err()
}

// ReviewMonths returns income and expense per month of year, January first,
// months with data only. Non-empty categories keeps only those categories.
func (l *Ledger) ReviewMonths(ctx context.Context, year int, categories []int64) ([]MonthSum, error) {
	from := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	filter, args := categoryFilter(categories, []any{from.Unix(), from.AddDate(1, 0, 0).Unix()})
	rows, err := l.read.QueryContext(ctx, `
SELECT CAST(strftime('%m', t.date, 'unixepoch') AS INTEGER) AS month,`+sums+`
FROM transactions t WHERE t.date >= ? AND t.date < ?`+filter+`
GROUP BY month ORDER BY month`, args...)
	if err != nil {
		return nil, fmt.Errorf("ledger: review months: %w", err)
	}
	defer rows.Close()
	out := []MonthSum{}
	for rows.Next() {
		var s MonthSum
		if err := rows.Scan(&s.Month, &s.Income, &s.Expense); err != nil {
			return nil, fmt.Errorf("ledger: review months: %w", err)
		}
		s.Income, s.Expense = cents(s.Income), cents(s.Expense)
		out = append(out, s)
	}
	return out, rows.Err()
}

// ReviewCategories returns income and expense per category in month (1 to
// 12) of year, by category id, categories with data only.
func (l *Ledger) ReviewCategories(ctx context.Context, year, month int) ([]CategorySum, error) {
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	rows, err := l.read.QueryContext(ctx, `
SELECT t.category_id, c.name,`+sums+`
FROM transactions t JOIN categories c ON c.id = t.category_id
WHERE t.date >= ? AND t.date < ?
GROUP BY t.category_id ORDER BY t.category_id`, from.Unix(), from.AddDate(0, 1, 0).Unix())
	if err != nil {
		return nil, fmt.Errorf("ledger: review categories: %w", err)
	}
	defer rows.Close()
	out := []CategorySum{}
	for rows.Next() {
		var s CategorySum
		if err := rows.Scan(&s.CategoryID, &s.Category, &s.Income, &s.Expense); err != nil {
			return nil, fmt.Errorf("ledger: review categories: %w", err)
		}
		s.Income, s.Expense = cents(s.Income), cents(s.Expense)
		out = append(out, s)
	}
	return out, rows.Err()
}
