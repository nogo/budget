package main

import (
	"bytes"
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nogo/budget/internal/ledger"
)

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

const secret = "0123456789abcdef0123456789abcdef"

func TestLoadConfigDefaults(t *testing.T) {
	c, err := loadConfig(env(map[string]string{"BUDGET_DEV_ACCOUNT": "dev", "BUDGET_SESSION_SECRET": secret}))
	if err != nil {
		t.Fatal(err)
	}
	if c.addr != ":4000" || c.baseURL != "http://localhost:4000" || c.data != "./data" ||
		c.access != filepath.Join("./data", "access.json") || c.lang != "de" || c.currency != "EUR" {
		t.Errorf("defaults %+v", c)
	}
	c, _ = loadConfig(env(map[string]string{"BUDGET_DEV_ACCOUNT": "dev", "BUDGET_SESSION_SECRET": secret, "BUDGET_DATA": "/data"}))
	if c.access != "/data/access.json" {
		t.Errorf("access %q", c.access)
	}
}

func TestLoadConfigRefuses(t *testing.T) {
	cases := map[string]map[string]string{
		"neither login":    {"BUDGET_SESSION_SECRET": secret},
		"both logins":      {"BUDGET_SESSION_SECRET": secret, "BUDGET_DEV_ACCOUNT": "dev", "OIDC_ISSUER": "https://id.example"},
		"no client":        {"BUDGET_SESSION_SECRET": secret, "OIDC_ISSUER": "https://id.example"},
		"short secret":     {"BUDGET_SESSION_SECRET": secret[:31], "BUDGET_DEV_ACCOUNT": "dev"},
		"unknown language": {"BUDGET_SESSION_SECRET": secret, "BUDGET_DEV_ACCOUNT": "dev", "BUDGET_LANG": "fr"},
		"bad currency":     {"BUDGET_SESSION_SECRET": secret, "BUDGET_DEV_ACCOUNT": "dev", "BUDGET_CURRENCY": "euro"},
	}
	for name, m := range cases {
		if _, err := loadConfig(env(m)); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	if _, err := loadConfig(env(map[string]string{"BUDGET_SESSION_SECRET": secret, "OIDC_ISSUER": "https://id.example",
		"OIDC_CLIENT_ID": "budget", "OIDC_CLIENT_SECRET": "x"})); err != nil {
		t.Errorf("oidc config: %v", err)
	}
}

func TestServeRefusesBadConfig(t *testing.T) {
	var out, errOut bytes.Buffer
	if code := run(context.Background(), []string{"serve"}, env(nil), &out, &errOut); code != 1 {
		t.Errorf("exit %d", code)
	}
	if !strings.Contains(errOut.String(), "OIDC_ISSUER") {
		t.Errorf("stderr %q", errOut.String())
	}
}

func TestNewCreatesLedger(t *testing.T) {
	path := filepath.Join(t.TempDir(), "n.sqlite")
	var out, errOut bytes.Buffer
	if code := run(context.Background(), []string{"new", path}, env(nil), &out, &errOut); code != 0 {
		t.Fatalf("exit %d: %s", code, errOut.String())
	}
	l, err := ledger.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	l.Close()
	if code := run(context.Background(), []string{"new", path}, env(nil), &out, &errOut); code != 1 {
		t.Errorf("second new: exit %d", code)
	}
}

func TestUsage(t *testing.T) {
	for _, args := range [][]string{nil, {"import", "one"}, {"nope"}} {
		var out, errOut bytes.Buffer
		if code := run(context.Background(), args, env(nil), &out, &errOut); code != 2 || !strings.Contains(errOut.String(), "usage") {
			t.Errorf("%v: exit %d", args, code)
		}
	}
}
