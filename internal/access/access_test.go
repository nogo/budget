package access

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

const sample = `{
  "ledgers": [
    {"id": "household", "name": "Haushalt", "file": "household.sqlite"},
    {"id": "kid", "name": "Kid", "file": "/abs/kid.sqlite"}
  ],
  "accounts": {"jane": ["household", "kid"], "john": ["household"]}
}`

func write(t *testing.T, dir, body string, mod time.Time) string {
	t.Helper()
	p := filepath.Join(dir, "access.json")
	if err := os.WriteFile(p, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(p, mod, mod); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestLedgersPerAccount(t *testing.T) {
	dir := t.TempDir()
	l, err := Open(write(t, dir, sample, time.Unix(1000, 0)), dir)
	if err != nil {
		t.Fatal(err)
	}
	got := l.Ledgers("jane")
	if len(got) != 2 || got[0].ID != "household" || got[1].ID != "kid" {
		t.Fatalf("jane: %+v", got)
	}
	if got[0].File != filepath.Join(dir, "household.sqlite") || got[1].File != "/abs/kid.sqlite" {
		t.Fatalf("files: %+v", got)
	}
	if _, ok := l.Ledger("john", "kid"); ok {
		t.Fatal("john must not open kid")
	}
	if lg, ok := l.Ledger("john", "household"); !ok || lg.Name != "Haushalt" {
		t.Fatalf("john household: %+v %v", lg, ok)
	}
	if got := l.Ledgers("stranger"); len(got) != 0 {
		t.Fatalf("stranger: %+v", got)
	}
}

func TestRereadsOnChange(t *testing.T) {
	dir := t.TempDir()
	p := write(t, dir, sample, time.Unix(1000, 0))
	l, err := Open(p, dir)
	if err != nil {
		t.Fatal(err)
	}
	write(t, dir, `{"ledgers":[{"id":"kid","file":"k.sqlite"}],"accounts":{"john":["kid"]}}`, time.Unix(2000, 0))
	if _, ok := l.Ledger("john", "kid"); !ok {
		t.Fatal("edit not picked up")
	}
	if _, ok := l.Ledger("john", "household"); ok {
		t.Fatal("removed access still granted")
	}
}

func TestBrokenEditKeepsLastGoodState(t *testing.T) {
	dir := t.TempDir()
	p := write(t, dir, sample, time.Unix(1000, 0))
	l, err := Open(p, dir)
	if err != nil {
		t.Fatal(err)
	}
	write(t, dir, `{not json`, time.Unix(2000, 0))
	if _, ok := l.Ledger("jane", "kid"); !ok {
		t.Fatal("broken edit dropped access")
	}
}

func TestInvalidFiles(t *testing.T) {
	cases := map[string]string{
		"bad id":         `{"ledgers":[{"id":"Bad Id","file":"x"}]}`,
		"no file":        `{"ledgers":[{"id":"a"}]}`,
		"duplicate":      `{"ledgers":[{"id":"a","file":"x"},{"id":"a","file":"y"}]}`,
		"unknown ledger": `{"ledgers":[{"id":"a","file":"x"}],"accounts":{"jane":["b"]}}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			dir := t.TempDir()
			if _, err := Open(write(t, dir, body, time.Unix(1000, 0)), dir); !errors.Is(err, ErrInvalid) {
				t.Fatalf("want ErrInvalid, got %v", err)
			}
		})
	}
}
