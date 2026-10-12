// Command budget runs the budget server and its maintenance tasks:
//
//	budget serve                      run the server (configuration from the environment)
//	budget import <old.sqlite> <new>  turn an old app database into a ledger file
//	budget new <new.sqlite>           create an empty ledger file
//	budget backup <dir>               copy every ledger and the access file into dir
//	budget health                     exit 0 when the local server answers
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"syscall"
	"time"

	"github.com/nogo/budget/internal/access"
	"github.com/nogo/budget/internal/auth"
	"github.com/nogo/budget/internal/importer"
	"github.com/nogo/budget/internal/ledger"
	"github.com/nogo/budget/internal/server"
)

// version is set at build time with -ldflags "-X main.version=…".
var version = "dev"

const usage = `usage:
  budget serve                         run the server
  budget import <old.sqlite> <new.sqlite>  import an old app database
  budget new <new.sqlite>              create an empty ledger file
  budget backup <dir>                  copy every ledger and the access file into dir
  budget health                        exit 0 when the local server answers
`

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	os.Exit(run(ctx, os.Args[1:], os.Getenv, os.Stdout, os.Stderr))
}

func run(ctx context.Context, args []string, getenv func(string) string, stdout, stderr io.Writer) int {
	if len(args) == 0 {
		fmt.Fprint(stderr, usage)
		return 2
	}
	var err error
	switch cmd, rest := args[0], args[1:]; {
	case cmd == "serve" && len(rest) == 0:
		err = serve(ctx, getenv, stderr)
	case cmd == "import" && len(rest) == 2:
		var c importer.Counts
		c, err = importer.Import(ctx, rest[0], rest[1])
		if err == nil {
			fmt.Fprintf(stdout, "imported %d categories, %d transactions, %d templates into %s\n",
				c.Categories, c.Transactions, c.Templates, rest[1])
			if c.Restored > 0 {
				fmt.Fprintf(stdout, "restored %d deleted categories still in use, named \"Unbekannt <id>\"; rename them in the app\n", c.Restored)
			}
		}
	case cmd == "new" && len(rest) == 1:
		err = ledger.Create(rest[0])
		if err == nil {
			fmt.Fprintf(stdout, "created %s\n", rest[0])
		}
	case cmd == "backup" && len(rest) == 1:
		err = backup(ctx, getenv, rest[0], stdout)
	case cmd == "health" && len(rest) == 0:
		err = health(ctx, getenv)
	default:
		fmt.Fprint(stderr, usage)
		return 2
	}
	if err != nil {
		fmt.Fprintln(stderr, "budget:", err)
		return 1
	}
	return 0
}

// config is the server configuration, read from the environment.
type config struct {
	addr, baseURL, data, access    string
	lang, currency                 string
	secret                         []byte
	issuer, clientID, clientSecret string
	devAccount                     string
}

var currencyPattern = regexp.MustCompile(`^[A-Z]{3}$`)

func loadConfig(getenv func(string) string) (config, error) {
	or := func(name, def string) string {
		if v := getenv(name); v != "" {
			return v
		}
		return def
	}
	c := config{
		addr:         or("BUDGET_ADDR", ":4000"),
		baseURL:      or("BUDGET_BASE_URL", "http://localhost:4000"),
		data:         or("BUDGET_DATA", "./data"),
		lang:         or("BUDGET_LANG", "de"),
		currency:     or("BUDGET_CURRENCY", "EUR"),
		secret:       []byte(getenv("BUDGET_SESSION_SECRET")),
		issuer:       getenv("OIDC_ISSUER"),
		clientID:     getenv("OIDC_CLIENT_ID"),
		clientSecret: getenv("OIDC_CLIENT_SECRET"),
		devAccount:   getenv("BUDGET_DEV_ACCOUNT"),
	}
	c.access = or("BUDGET_ACCESS", filepath.Join(c.data, "access.json"))
	switch {
	case (c.issuer == "") == (c.devAccount == ""):
		return c, errors.New("set exactly one of OIDC_ISSUER and BUDGET_DEV_ACCOUNT")
	case c.issuer != "" && (c.clientID == "" || c.clientSecret == ""):
		return c, errors.New("OIDC_ISSUER needs OIDC_CLIENT_ID and OIDC_CLIENT_SECRET")
	case len(c.secret) < 32:
		return c, errors.New("BUDGET_SESSION_SECRET must be at least 32 bytes")
	case c.lang != "de" && c.lang != "en":
		return c, fmt.Errorf("BUDGET_LANG must be de or en, not %q", c.lang)
	case !currencyPattern.MatchString(c.currency):
		return c, fmt.Errorf("BUDGET_CURRENCY must be an ISO 4217 code like EUR, not %q", c.currency)
	}
	return c, nil
}

func serve(ctx context.Context, getenv func(string) string, logOut io.Writer) error {
	log := slog.New(slog.NewTextHandler(logOut, nil))
	c, err := loadConfig(getenv)
	if err != nil {
		return err
	}
	list, err := access.Open(c.access, c.data)
	if err != nil {
		return err
	}
	a, err := auth.New(ctx, auth.Config{
		Issuer: c.issuer, ClientID: c.clientID, ClientSecret: c.clientSecret,
		BaseURL: c.baseURL, Secret: c.secret, DevAccount: c.devAccount,
	})
	if err != nil {
		return err
	}
	if c.devAccount != "" {
		log.Warn("development login: anyone reaching this server is signed in", "account", c.devAccount)
	}

	srv := server.New(server.Config{Lang: c.lang, Currency: c.currency, Version: version}, a, list, log)
	mux := http.NewServeMux()
	a.Register(mux)
	srv.Register(mux)
	hs := &http.Server{
		Addr:              c.addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       2 * time.Minute,
		ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}

	errc := make(chan error, 1)
	go func() { errc <- hs.ListenAndServe() }()
	log.Info("budget serving", "addr", c.addr, "version", version, "data", c.data)

	select {
	case err = <-errc:
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		err = hs.Shutdown(shutdownCtx)
		if lerr := <-errc; !errors.Is(lerr, http.ErrServerClosed) && err == nil {
			err = lerr
		}
	}
	if errors.Is(err, http.ErrServerClosed) {
		err = nil
	}
	return errors.Join(err, srv.Close())
}

// backup copies every ledger named in the access file, and the access file
// itself, into dir. It runs beside a live server: each ledger is copied from
// one SQLite snapshot.
func backup(ctx context.Context, getenv func(string) string, dir string, stdout io.Writer) error {
	data := getenv("BUDGET_DATA")
	if data == "" {
		data = "./data"
	}
	accessPath := getenv("BUDGET_ACCESS")
	if accessPath == "" {
		accessPath = filepath.Join(data, "access.json")
	}
	list, err := access.Open(accessPath, data)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	raw, err := os.ReadFile(accessPath)
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "access.json"), raw, 0o600); err != nil {
		return err
	}
	for _, lg := range list.All() {
		l, err := ledger.Open(lg.File)
		if err != nil {
			return err
		}
		target := filepath.Join(dir, filepath.Base(lg.File))
		err = l.Backup(ctx, target)
		l.Close()
		if err != nil {
			return err
		}
		fmt.Fprintf(stdout, "backed up %s to %s\n", lg.ID, target)
	}
	return nil
}

// health asks the server on this machine for /healthz. The container image
// has no shell or curl, so its health check runs this.
func health(ctx context.Context, getenv func(string) string) error {
	addr := getenv("BUDGET_ADDR")
	if addr == "" {
		addr = ":4000"
	}
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://127.0.0.1:"+port+"/healthz", nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("health: %s", res.Status)
	}
	return nil
}
