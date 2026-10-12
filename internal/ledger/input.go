package ledger

import (
	"math"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// Type says whether money went out or came in.
type Type string

const (
	Expense Type = "expense"
	Income  Type = "income"
)

// MaxAmount is the largest amount a transaction or template may have.
const MaxAmount = 1_000_000_000

// MaxText is the most characters a note or name may have.
const MaxText = 500

const dateLayout = "2006-01-02"

var keyPattern = regexp.MustCompile(`^[A-Za-z0-9-]{8,64}$`)

// ParseDate turns "YYYY-MM-DD" into the unix time of that day's midnight UTC.
func ParseDate(s string) (int64, bool) {
	t, err := time.Parse(dateLayout, s)
	if err != nil {
		return 0, false
	}
	return t.Unix(), true
}

// FormatDate turns a stored date back into "YYYY-MM-DD".
func FormatDate(unix int64) string {
	return time.Unix(unix, 0).UTC().Format(dateLayout)
}

// ParseMonth turns "YYYY-MM" into the unix times of the first day of that
// month and of the next month, both midnight UTC.
func ParseMonth(s string) (from, to int64, ok bool) {
	t, err := time.Parse("2006-01", s)
	if err != nil {
		return 0, 0, false
	}
	return t.Unix(), t.AddDate(0, 1, 0).Unix(), true
}

// cents rounds an amount to whole cents.
func cents(a float64) float64 { return math.Round(a*100) / 100 }

func validAmount(a float64, allowZero bool) (float64, error) {
	a = cents(a)
	if math.IsNaN(a) || a < 0 || (a == 0 && !allowZero) || a > MaxAmount {
		return 0, invalid("amount")
	}
	return a, nil
}

func validType(t Type) error {
	if t != Expense && t != Income {
		return invalid("type")
	}
	return nil
}

func validText(s, field string, required bool) (string, error) {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) > MaxText || (required && s == "") {
		return "", invalid(field)
	}
	return s, nil
}
