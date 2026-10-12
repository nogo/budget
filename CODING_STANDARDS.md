# Coding standards

Language rules for budget. Stack, dependency policy and project rules are in `AGENTS.md`; decisions in `docs/decisions.md`.

Base: [Effective Go](https://go.dev/doc/effective_go), [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments), [Google Go Style](https://google.github.io/styleguide/go/); [MDN](https://developer.mozilla.org/) for the platform. Where this file is silent, they apply.

## Check

`mise run check` (vet, gofmt, tidy, `go test -race`) must pass before a change is done.
UI changes also run `mise run test:browser`.

## Measure

What the numbers mean and how far to trust them: the `software-design` skill's MEASURE.md. The tools are pinned in `mise.toml`.

- `mise run measure` — complexity, duplication, interface size per package. `MEASURE_DIRS=internal/ledger` narrows it.
- `MEASURE_REF=<commit> mise run measure:diff` — the same, before against after. A refactor reports this.
- `MEASURE_PKG=./internal/ledger mise run measure:mutation` — mutation score; about a minute per package.
- `mise run measure:flaky` — the suite 10 times, shuffled, with `-race`.
- `mise run measure:history` — hotspots and change coupling, once there are months of history.

Five functions are over cognitive complexity 15 today (`mise run measure`); a change doesn't add one unless its comment says why. JavaScript has no complexity tool (no npm); use `measure:history` and review.

## Go

### Structure
- Packages live under `internal/`, one concept each, named for it (`ledger`, `access`), never `util` or `common`.
- Every package starts with a package comment saying what it is and when to reach for it; `doc.go` when the package has several files.
- An interface is declared where it's consumed and holds only the methods that consumer calls. No interface for a single implementation unless a test fake is the second.
- Wiring happens in `cmd/budget`. A package doesn't construct its own collaborators.

### Naming
- Short receivers, same name on every method of a type.
- Exported identifiers read well with the package: `ledger.Open`, not `ledger.OpenLedger`.
- Constants for closed sets of strings (`ledger.Expense`), typed when the set is a kind.

### Errors
- Messages start with the package: `"ledger: closed"`, `"access: no ledger %q"`.
- Wrap with `%w` and add the context the caller lacks (file, line, id). Don't wrap twice with the same context.
- Callers branch on sentinels (`ErrInvalid`, `ErrClosed`) via `errors.Is`, never on message text.
- No `panic` outside `main` and impossible states.

### Concurrency
- Every goroutine has an owner that stops it; `Close` waits for it.
- A mutex guards named fields; say which in a comment on the field or struct.
- Tests run with `-race`; a race is a bug, not flake.

### Tests
- Fakes over mocks: an in-memory type with the real interface (`fakes_test.go`), asserting on outcomes, not calls.
- Temporary files via `t.TempDir()`; no fixed paths, no shared state between tests.
- Table-driven only when the cases share one shape; otherwise separate tests with descriptive names.
- Tests never need the real identity provider; a fake OIDC provider runs on `httptest`.
- Wait for a signal (channel, event, condition), never `time.Sleep`.
- A test restores what it changes outside `t.TempDir()` — permissions, env, globals — with `t.Cleanup`.
- A bug fix starts with a test that fails for the bug's reason.
- A pure refactor changes no test assertions. Moving a test to a new interface is fine.

## JavaScript

### Structure
- Plain ES modules; each file opens with a comment saying what it holds.
- One store (`state.js`); components render from it and never keep a second copy of server state.
- Components are `AurilElement` subclasses, one file per feature; a file may define the few elements that feature needs.
- Platform first: `<dialog>`, `popover`, CSS before JS. auril's guardrail (`web/auril/FRAMEWORK.md`) holds; app helpers stay in `web/js/`.

### Naming
- `camelCase` for functions and variables, `kebab-case` for custom elements and CSS classes.
- Store keys name the thing, with a trailing comment when the shape isn't obvious.

### Tests
- UI behaviour is covered by a `browser-*.sh` script in `internal/server/testdata/`, run on fakes.

## Overrides

- None yet. Add one when a review hits the same defect twice.
