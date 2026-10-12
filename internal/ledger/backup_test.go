package ledger

import (
	"context"
	"path/filepath"
	"testing"
)

func TestBackupIsAnOpenableCopy(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.sqlite")
	if err := Create(src); err != nil {
		t.Fatal(err)
	}
	l, err := Open(src)
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	ctx := context.Background()
	if _, err := l.CreateCategory(ctx, CategoryInput{Name: "Bäcker"}); err != nil {
		t.Fatal(err)
	}
	dst := filepath.Join(dir, "copy.sqlite")
	if err := l.Backup(ctx, dst); err != nil {
		t.Fatal(err)
	}
	c, err := Open(dst)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	cats, err := c.Categories(ctx)
	if err != nil || len(cats) != 1 || cats[0].Name != "Bäcker" {
		t.Fatalf("copy: %+v %v", cats, err)
	}
	if err := l.Backup(ctx, dst); err == nil {
		t.Fatal("backup over an existing file must fail")
	}
}
