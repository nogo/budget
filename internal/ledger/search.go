package ledger

import (
	"math"
	"regexp"
	"strconv"
	"strings"
)

// Search is a parsed search query, as the old app's src/lib/query.ts parsed it.
type Search struct {
	// Categories holds the lowercased #terms; a transaction matches when its
	// category name contains any of them, case-insensitive.
	Categories []string
	// Cents holds the =amounts in cents; a transaction matches any of them.
	Cents []int64
	// Words holds the lowercased remaining words; each must be in the note.
	Words []string
}

var (
	categoryTerm = regexp.MustCompile(`#[\p{L}\p{N}_]+`)
	amountTerm   = regexp.MustCompile(`=([0-9]+[,.][0-9]+|[0-9]+)`)
)

// ParseSearch splits q into #category terms, =amount terms and note words.
func ParseSearch(q string) Search {
	var s Search
	for _, m := range categoryTerm.FindAllString(q, -1) {
		s.Categories = append(s.Categories, strings.ToLower(m[1:]))
	}
	for _, m := range amountTerm.FindAllStringSubmatch(q, -1) {
		f, err := strconv.ParseFloat(strings.Replace(m[1], ",", ".", 1), 64)
		if err == nil {
			s.Cents = append(s.Cents, int64(math.Round(f*100)))
		}
	}
	rest := amountTerm.ReplaceAllString(categoryTerm.ReplaceAllString(q, ""), "")
	for _, w := range strings.Fields(rest) {
		s.Words = append(s.Words, strings.ToLower(w))
	}
	return s
}
