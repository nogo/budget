package server

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/nogo/budget/web"
)

// contentTypes covers every extension in web/; mime.TypeByExtension depends
// on the host's mime files, so the server does not rely on it.
var contentTypes = map[string]string{
	".html":        "text/html; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".json":        "application/json",
	".webmanifest": "application/manifest+json",
	".png":         "image/png",
	".ico":         "image/x-icon",
	".svg":         "image/svg+xml",
	".woff2":       "font/woff2",
	".txt":         "text/plain; charset=utf-8",
	".md":          "text/plain; charset=utf-8",
	".ts":          "text/plain; charset=utf-8",
}

// noCache lists the files the browser must revalidate on every load, so a
// new version reaches it.
var noCache = map[string]bool{"index.html": true, "sw.js": true}

// static serves web.FS. A path without a dot outside /api/ and /auth/
// answers index.html, so the browser's own routes survive a reload.
func static() http.Handler {
	return staticFS(web.FS)
}

func staticFS(files fs.FS) http.Handler {
	worker := serviceWorker(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		p := path.Clean("/" + r.URL.Path)
		if strings.HasPrefix(p+"/", "/api/") || strings.HasPrefix(p+"/", "/auth/") {
			http.NotFound(w, r)
			return
		}
		name := strings.TrimPrefix(p, "/")
		if !strings.Contains(path.Base(p), ".") {
			name = "index.html"
		}
		data, err := fs.ReadFile(files, name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		if name == "sw.js" {
			data = worker
		}
		ct, ok := contentTypes[path.Ext(name)]
		if !ok {
			ct = "application/octet-stream"
		}
		w.Header().Set("Content-Type", ct)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		sum := sha256.Sum256(data)
		w.Header().Set("ETag", `"`+hex.EncodeToString(sum[:12])+`"`)
		if noCache[name] {
			w.Header().Set("Cache-Control", "no-cache")
		}
		http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(data))
	})
}

// serviceWorker returns sw.js with its shell list and cache name filled in:
// every file the app needs offline, and a hash over their contents. A
// hand-kept list goes stale the day a file is added; this one cannot.
func serviceWorker(files fs.FS) []byte {
	src, err := fs.ReadFile(files, "sw.js")
	if err != nil {
		return nil
	}
	shell := []string{"/"}
	h := sha256.New()
	fs.WalkDir(files, ".", func(name string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !inShell(name) {
			return nil
		}
		data, err := fs.ReadFile(files, name)
		if err != nil {
			return nil
		}
		shell = append(shell, "/"+name)
		h.Write([]byte(name))
		h.Write(data)
		return nil
	})
	list, _ := json.Marshal(shell)
	out := bytes.Replace(src, []byte("const SHELL = ['/'];"), []byte("const SHELL = "+string(list)+";"), 1)
	return bytes.Replace(out, []byte("'budget-shell-dev'"), []byte("'budget-shell-"+hex.EncodeToString(h.Sum(nil)[:8])+"'"), 1)
}

// inShell reports whether an embedded file belongs in the offline shell.
// index.html is cached as "/"; the worker itself and docs are left out.
func inShell(name string) bool {
	switch {
	case name == "index.html" || name == "sw.js" || name == "web.go":
		return false
	case path.Ext(name) == ".md" || path.Base(name) == "LICENSE":
		return false
	}
	_, known := contentTypes[path.Ext(name)]
	return known
}
