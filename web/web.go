// Package web holds the browser UI: plain HTML, CSS and JS on vendored auril,
// with no build step. The server embeds it from here.
package web

import "embed"

//go:embed index.html style.css sw.js manifest.json js img auril
var FS embed.FS
