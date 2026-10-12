package server

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/nogo/budget/internal/ledger"
)

func (s *Server) listTransactions(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	q := r.URL.Query()
	ts, err := l.Transactions(r.Context(), q.Get("month"), q.Get("q"))
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, ts)
}

func (s *Server) getTransaction(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	t, err := l.Transaction(r.Context(), id)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) createTransaction(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	var body struct {
		Key string `json:"key"`
		ledger.TransactionInput
	}
	if !s.decode(w, r, &body) {
		return
	}
	t, created, err := l.CreateTransaction(r.Context(), body.Key, body.TransactionInput)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, t)
}

func (s *Server) updateTransaction(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	var in ledger.TransactionInput
	if !s.decode(w, r, &in) {
		return
	}
	t, err := l.UpdateTransaction(r.Context(), id, in)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) deleteTransaction(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	s.deleteByID(w, r, l.DeleteTransaction)
}

func (s *Server) deleteByID(w http.ResponseWriter, r *http.Request, del func(ctx context.Context, id int64) error) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	if err := del(r.Context(), id); err != nil {
		s.failErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	cs, err := l.Categories(r.Context())
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, cs)
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	var in ledger.CategoryInput
	if !s.decode(w, r, &in) {
		return
	}
	c, err := l.CreateCategory(r.Context(), in)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) updateCategory(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	var in ledger.CategoryInput
	if !s.decode(w, r, &in) {
		return
	}
	c, err := l.UpdateCategory(r.Context(), id, in)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) deleteCategory(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	s.deleteByID(w, r, l.DeleteCategory)
}

func (s *Server) listTemplates(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	var category int64
	if v := r.URL.Query().Get("category"); v != "" {
		var err error
		if category, err = strconv.ParseInt(v, 10, 64); err != nil || category <= 0 {
			s.fail(w, http.StatusBadRequest, "invalid.category", "category")
			return
		}
	}
	ts, err := l.Templates(r.Context(), category)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, ts)
}

func (s *Server) getTemplate(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	t, err := l.Template(r.Context(), id)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) createTemplate(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	var in ledger.TemplateInput
	if !s.decode(w, r, &in) {
		return
	}
	t, err := l.CreateTemplate(r.Context(), in)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (s *Server) updateTemplate(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	id, ok := s.pathID(w, r)
	if !ok {
		return
	}
	var in ledger.TemplateInput
	if !s.decode(w, r, &in) {
		return
	}
	t, err := l.UpdateTemplate(r.Context(), id, in)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) deleteTemplate(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	s.deleteByID(w, r, l.DeleteTemplate)
}

// categoryIDs reads ?categories=1,2. On failure it answers 400.
func (s *Server) categoryIDs(w http.ResponseWriter, r *http.Request) ([]int64, bool) {
	v := r.URL.Query().Get("categories")
	if v == "" {
		return nil, true
	}
	var out []int64
	for _, part := range strings.Split(v, ",") {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id <= 0 {
			s.fail(w, http.StatusBadRequest, "invalid.categories", "categories")
			return nil, false
		}
		out = append(out, id)
	}
	return out, true
}

func (s *Server) reviewYears(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	cats, ok := s.categoryIDs(w, r)
	if !ok {
		return
	}
	ys, err := l.ReviewYears(r.Context(), cats)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, ys)
}

// pathYear reads {year}; a year outside 1970 to 9999 answers 404.
func (s *Server) pathYear(w http.ResponseWriter, r *http.Request) (int, bool) {
	y, err := strconv.Atoi(r.PathValue("year"))
	if err != nil || y < 1970 || y > 9999 {
		s.fail(w, http.StatusNotFound, "not_found", "")
		return 0, false
	}
	return y, true
}

func (s *Server) reviewMonths(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	year, ok := s.pathYear(w, r)
	if !ok {
		return
	}
	cats, ok := s.categoryIDs(w, r)
	if !ok {
		return
	}
	ms, err := l.ReviewMonths(r.Context(), year, cats)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, ms)
}

func (s *Server) reviewCategories(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	year, ok := s.pathYear(w, r)
	if !ok {
		return
	}
	month, err := strconv.Atoi(r.PathValue("month"))
	if err != nil || month < 1 || month > 12 {
		s.fail(w, http.StatusNotFound, "not_found", "")
		return
	}
	cs, err := l.ReviewCategories(r.Context(), year, month)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, cs)
}

// reviewGrid answers the heatmap cells: per category and month of ?year=,
// or per category and year without it.
func (s *Server) reviewGrid(w http.ResponseWriter, r *http.Request, l *ledger.Ledger) {
	year := 0
	if v := r.URL.Query().Get("year"); v != "" {
		y, err := strconv.Atoi(v)
		if err != nil || y < 1970 || y > 9999 {
			s.fail(w, http.StatusBadRequest, "invalid.year", "year")
			return
		}
		year = y
	}
	cells, err := l.ReviewGrid(r.Context(), year)
	if err != nil {
		s.failErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, cells)
}
