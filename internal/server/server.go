// Package server is the HTTP side of budget: the JSON routes under /api/ and
// the embedded browser files. Reach for it to change what a route answers;
// login lives in internal/auth, data in internal/ledger.
package server

import (
	"encoding/json"
	"errors"
	"log/slog"
	"mime"
	"net/http"
	"strconv"
	"sync"

	"github.com/nogo/budget/internal/access"
	"github.com/nogo/budget/internal/ledger"
)

// Accounts tells which account a request belongs to.
type Accounts interface {
	Account(w http.ResponseWriter, r *http.Request) (string, bool)
}

// Access tells which ledgers an account may open.
type Access interface {
	Ledgers(account string) []access.Ledger
	Ledger(account, id string) (access.Ledger, bool)
}

// Config is what the server tells the browser about the instance.
type Config struct {
	Lang     string // "de" or "en"
	Currency string // ISO 4217
	Version  string
}

// Server answers the API and serves the browser files.
type Server struct {
	cfg      Config
	accounts Accounts
	access   Access
	log      *slog.Logger

	mu      sync.Mutex // guards ledgers and closed
	ledgers map[string]*ledger.Ledger
	closed  bool
}

// New returns a server. Ledger files are opened on first use.
func New(cfg Config, accounts Accounts, acc Access, log *slog.Logger) *Server {
	if log == nil {
		log = slog.Default()
	}
	return &Server{cfg: cfg, accounts: accounts, access: acc, log: log, ledgers: map[string]*ledger.Ledger{}}
}

// Register mounts the API routes and the static files on mux. Login routes
// are mounted by the auth package.
func (s *Server) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/session", s.session)
	// healthz answers without a session, for the container health check.
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("ok\n"))
	})

	const p = "/api/ledgers/{ledger}"
	mux.HandleFunc("GET "+p+"/transactions", s.withLedger(s.listTransactions))
	mux.HandleFunc("GET "+p+"/transactions/{id}", s.withLedger(s.getTransaction))
	mux.HandleFunc("POST "+p+"/transactions", s.withLedger(s.createTransaction))
	mux.HandleFunc("PUT "+p+"/transactions/{id}", s.withLedger(s.updateTransaction))
	mux.HandleFunc("DELETE "+p+"/transactions/{id}", s.withLedger(s.deleteTransaction))

	mux.HandleFunc("GET "+p+"/categories", s.withLedger(s.listCategories))
	mux.HandleFunc("POST "+p+"/categories", s.withLedger(s.createCategory))
	mux.HandleFunc("PUT "+p+"/categories/{id}", s.withLedger(s.updateCategory))
	mux.HandleFunc("DELETE "+p+"/categories/{id}", s.withLedger(s.deleteCategory))

	mux.HandleFunc("GET "+p+"/templates", s.withLedger(s.listTemplates))
	mux.HandleFunc("GET "+p+"/templates/{id}", s.withLedger(s.getTemplate))
	mux.HandleFunc("POST "+p+"/templates", s.withLedger(s.createTemplate))
	mux.HandleFunc("PUT "+p+"/templates/{id}", s.withLedger(s.updateTemplate))
	mux.HandleFunc("DELETE "+p+"/templates/{id}", s.withLedger(s.deleteTemplate))

	mux.HandleFunc("GET "+p+"/review/years", s.withLedger(s.reviewYears))
	mux.HandleFunc("GET "+p+"/review/{year}", s.withLedger(s.reviewMonths))
	mux.HandleFunc("GET "+p+"/review/{year}/{month}", s.withLedger(s.reviewCategories))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		s.fail(w, http.StatusNotFound, "not_found", "")
	})
	mux.Handle("/", static())
}

// Close closes every opened ledger. Requests after Close answer 503.
func (s *Server) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.closed = true
	var errs []error
	for path, l := range s.ledgers {
		errs = append(errs, l.Close())
		delete(s.ledgers, path)
	}
	return errors.Join(errs...)
}

var errClosed = errors.New("server: closed")

// open returns the ledger of file path, opening it on first use.
func (s *Server) open(path string) (*ledger.Ledger, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return nil, errClosed
	}
	if l, ok := s.ledgers[path]; ok {
		return l, nil
	}
	l, err := ledger.Open(path)
	if err != nil {
		return nil, err
	}
	s.ledgers[path] = l
	return l, nil
}

type ledgerHandler func(w http.ResponseWriter, r *http.Request, l *ledger.Ledger)

// withLedger checks session, access and content type, then hands the
// request's ledger to h.
func (s *Server) withLedger(h ledgerHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		account, ok := s.accounts.Account(w, r)
		if !ok {
			s.fail(w, http.StatusUnauthorized, "unauthorized", "")
			return
		}
		info, ok := s.access.Ledger(account, r.PathValue("ledger"))
		if !ok {
			s.fail(w, http.StatusForbidden, "forbidden", "")
			return
		}
		if r.Method == http.MethodPost || r.Method == http.MethodPut {
			mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
			if mt != "application/json" {
				s.fail(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "")
				return
			}
		}
		l, err := s.open(info.File)
		if err != nil {
			s.log.Error("open ledger", "ledger", info.ID, "err", err)
			s.fail(w, http.StatusServiceUnavailable, "ledger_unavailable", "")
			return
		}
		h(w, r, l)
	}
}

type ledgerRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (s *Server) session(w http.ResponseWriter, r *http.Request) {
	account, ok := s.accounts.Account(w, r)
	if !ok {
		// The login screen has no session to learn the language from.
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": message(s.cfg.Lang, "unauthorized"), "lang": s.cfg.Lang})
		return
	}
	refs := []ledgerRef{}
	for _, l := range s.access.Ledgers(account) {
		refs = append(refs, ledgerRef{l.ID, l.Name})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"account":  account,
		"lang":     s.cfg.Lang,
		"currency": s.cfg.Currency,
		"version":  s.cfg.Version,
		"ledgers":  refs,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

type errorBody struct {
	Error string `json:"error"`
	Field string `json:"field,omitempty"`
}

// fail answers an error in the instance language. code names a message in
// the messages table; field names the input at fault, if one is.
func (s *Server) fail(w http.ResponseWriter, status int, code, field string) {
	writeJSON(w, status, errorBody{Error: message(s.cfg.Lang, code), Field: field})
}

// failErr maps an error from the ledger to a status and message.
func (s *Server) failErr(w http.ResponseWriter, r *http.Request, err error) {
	var fe *ledger.FieldError
	switch {
	case errors.As(err, &fe):
		s.fail(w, http.StatusBadRequest, "invalid."+fe.Field, fe.Field)
	case errors.Is(err, ledger.ErrNotFound):
		s.fail(w, http.StatusNotFound, "not_found", "")
	case errors.Is(err, ledger.ErrDuplicate):
		s.fail(w, http.StatusConflict, "duplicate_name", "name")
	case errors.Is(err, ledger.ErrInUse):
		s.fail(w, http.StatusConflict, "category_in_use", "")
	default:
		s.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "err", err)
		s.fail(w, http.StatusInternalServerError, "internal", "")
	}
}

// decode reads a JSON body of at most 64 KiB into v. On failure it answers
// 400 and returns false.
func (s *Server) decode(w http.ResponseWriter, r *http.Request, v any) bool {
	err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(v)
	if err == nil {
		return true
	}
	var te *json.UnmarshalTypeError
	if errors.As(err, &te) && te.Field != "" {
		s.fail(w, http.StatusBadRequest, "invalid."+te.Field, te.Field)
		return false
	}
	s.fail(w, http.StatusBadRequest, "bad_request", "")
	return false
}

// pathID reads the {id} path value. On failure it answers 404 and returns false.
func (s *Server) pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		s.fail(w, http.StatusNotFound, "not_found", "")
		return 0, false
	}
	return id, true
}
