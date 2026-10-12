# Budget — agent instructions

A self-hosted budget app for one family: several ledgers, each a SQLite file, opened by accounts that sign in through OpenID Connect. Go server, plain-JavaScript interface on vendored auril.js, installable as a PWA.

## Read first

- `docs/project.md`: the north star. If a change doesn't serve it, it doesn't belong.
- `docs/decisions.md`: what is decided. Don't reopen a decision in code; propose a new entry.
- `docs/api.md`: the contract between server and browser, the ledger schema and the configuration.
- `docs/parity.md`: every behaviour of the old app; the final acceptance test.
- `CODING_STANDARDS.md`: the Go and JS rules a review checks against.
- The old TanStack app lives on the `main` branch history (version 2.4.0); `screenshots/` shows its look, which the new interface keeps.

## Stack

- Backend: **Go**, one binary, pinned in `mise.toml`. Standard library plus `github.com/mattn/go-sqlite3` (cgo). Every other dependency needs an entry in `docs/decisions.md` first.
- Frontend: plain HTML/JS/CSS on vendored **auril.js** (`web/auril/`, read its `FRAMEWORK.md`). No npm, no bundler, no build step, no chart library.
- Run tools through mise: `mise exec -- go test ./...`, `mise run check`.

## Rules

- **No real data in the repo.** `data/` holds a copy of the family's ledger and is git-ignored. Tests use invented fixtures.
- **No secrets** in files, commits or test fixtures.
- **Verify before claiming.** Name the command or test that proves it.
- **Small changes.** Do the task, not the adjacent improvement. Put anything else in a note.
- **Comments:** a short one above a function (what it's for, when to reach for it); inline comments only when they earn their place.

## Commits

- `area: imperative summary`, never `feat:`/`fix:`. Body only when the diff cannot show why. No `Co-Authored-By` trailer.
- Commit and push only when Danilo says so.
