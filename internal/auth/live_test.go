package auth

import (
	"context"
	"net/http"
	"os"
	"testing"
	"time"
)

// TestLiveDiscovery reads the real provider's discovery document and keys.
// Read only; run with BUDGET_LIVE=1.
func TestLiveDiscovery(t *testing.T) {
	if os.Getenv("BUDGET_LIVE") != "1" {
		t.Skip("set BUDGET_LIVE=1 to contact https://box.kuehns.club")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client := &http.Client{Timeout: 15 * time.Second}
	p, err := discover(ctx, client, "https://box.kuehns.club", "unused", "unused")
	if err != nil {
		t.Fatal(err)
	}
	keys, err := p.fetchKeys(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) == 0 {
		t.Fatal("no usable RSA signing keys")
	}
	t.Logf("authorize %s, token %s, jwks %s, client_secret_post %v", p.authURL, p.tokenURL, p.jwksURL, p.postAuth)
	for kid, k := range keys {
		t.Logf("key kid=%q bits=%d e=%d", kid, k.N.BitLen(), k.E)
	}
}
