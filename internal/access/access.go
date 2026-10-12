// Package access reads the access file: which ledgers exist and which account
// may open which of them. Reach for it to answer "may this account open this
// ledger?"; it rereads the file when it changes, so edits need no restart.
package access

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"time"
)

// ErrInvalid marks an access file that cannot be used.
var ErrInvalid = errors.New("access: invalid file")

var idPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

// Ledger is one ledger an account may open. File is an absolute path.
type Ledger struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	File string `json:"file"`
}

type file struct {
	Ledgers  []Ledger            `json:"ledgers"`
	Accounts map[string][]string `json:"accounts"`
}

// List answers access questions from the access file at path.
type List struct {
	path    string
	dataDir string

	mu       sync.Mutex // guards modTime, ledgers, accounts
	modTime  time.Time
	ledgers  map[string]Ledger
	accounts map[string][]string
}

// Open reads the access file at path. Ledger files are resolved against dataDir.
func Open(path, dataDir string) (*List, error) {
	l := &List{path: path, dataDir: dataDir}
	if err := l.reload(); err != nil {
		return nil, err
	}
	return l, nil
}

// Ledgers returns the ledgers account may open, in file order.
func (l *List) Ledgers(account string) []Ledger {
	l.refresh()
	l.mu.Lock()
	defer l.mu.Unlock()
	var out []Ledger
	for _, id := range l.accounts[account] {
		if lg, ok := l.ledgers[id]; ok {
			out = append(out, lg)
		}
	}
	return out
}

// Ledger returns ledger id if account may open it.
func (l *List) Ledger(account, id string) (Ledger, bool) {
	for _, lg := range l.Ledgers(account) {
		if lg.ID == id {
			return lg, true
		}
	}
	return Ledger{}, false
}

// All returns every ledger in the file, for opening them at start.
func (l *List) All() []Ledger {
	l.refresh()
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]Ledger, 0, len(l.ledgers))
	for _, lg := range l.ledgers {
		out = append(out, lg)
	}
	return out
}

// refresh rereads the file when its modification time changed. A broken edit
// keeps the last good state, so a typo never locks the family out.
func (l *List) refresh() {
	info, err := os.Stat(l.path)
	if err != nil {
		return
	}
	l.mu.Lock()
	changed := !info.ModTime().Equal(l.modTime)
	l.mu.Unlock()
	if changed {
		_ = l.reload()
	}
}

func (l *List) reload() error {
	info, err := os.Stat(l.path)
	if err != nil {
		return fmt.Errorf("access: %w", err)
	}
	raw, err := os.ReadFile(l.path)
	if err != nil {
		return fmt.Errorf("access: %w", err)
	}
	var f file
	if err := json.Unmarshal(raw, &f); err != nil {
		return fmt.Errorf("%w: %s: %v", ErrInvalid, l.path, err)
	}
	ledgers := make(map[string]Ledger, len(f.Ledgers))
	for _, lg := range f.Ledgers {
		if !idPattern.MatchString(lg.ID) {
			return fmt.Errorf("%w: ledger id %q", ErrInvalid, lg.ID)
		}
		if lg.File == "" {
			return fmt.Errorf("%w: ledger %q has no file", ErrInvalid, lg.ID)
		}
		if _, dup := ledgers[lg.ID]; dup {
			return fmt.Errorf("%w: ledger %q twice", ErrInvalid, lg.ID)
		}
		if lg.Name == "" {
			lg.Name = lg.ID
		}
		if !filepath.IsAbs(lg.File) {
			lg.File = filepath.Join(l.dataDir, lg.File)
		}
		ledgers[lg.ID] = lg
	}
	for account, ids := range f.Accounts {
		for _, id := range ids {
			if _, ok := ledgers[id]; !ok {
				return fmt.Errorf("%w: account %q names unknown ledger %q", ErrInvalid, account, id)
			}
		}
	}
	l.mu.Lock()
	l.modTime, l.ledgers, l.accounts = info.ModTime(), ledgers, f.Accounts
	l.mu.Unlock()
	return nil
}
