# Decisions

New entries go at the end. An entry is never edited; a later entry supersedes it and names the one it replaces.

## 2026-10-12 — Rewrite in Go and auril.js

The TanStack Start, React and Drizzle app is replaced by a Go server and a plain-JavaScript interface on vendored auril.js. The Go server also serves the interface. The goal is no or minimal dependencies, so the app needs little care over the years. The only Go dependency is `github.com/mattn/go-sqlite3`, chosen over `modernc.org/sqlite` because it pulls in nothing else; the cost is a C compiler at build time. Go is pinned with mise.

## 2026-10-12 — One instance, many ledgers, one SQLite file per ledger

Two deployments ran side by side: one ledger for the parents, one for the daughter. They merge into one instance. Each ledger is its own SQLite file with its own categories, templates and transactions. The tables keep the structure of the old app, so the data needs no reshaping.

## 2026-10-12 — Accounts are separate from ledgers

An account is a person allowed to open a ledger; one ledger can have several accounts. Access is all or nothing per ledger, with no read-only level. A hand-edited access file maps accounts to ledgers. Nextcloud groups were rejected so the identity provider can change without rebuilding groups. A transaction does not record who entered it.

## 2026-10-12 — Sign-in by OpenID Connect

Nextcloud (with its OIDC app) provides login first; another provider may replace it later. The app uses only standard OpenID Connect endpoints from the discovery document, never a Nextcloud-specific API. It stores no passwords and has no registration.

## 2026-10-12 — A transaction has a date, stored as midnight UTC

The old data mixed midnight UTC, midnight Berlin time and real times of day. Read in Berlin time, every row gives the right day, but the old review grouped by UTC and counted 41 transactions from the 1st of a month in the month before. Every date is normalised once to midnight UTC of its Berlin day when a ledger is imported. After that, no code needs a time zone.

## 2026-10-12 — Clean ledger files, nothing from Drizzle or Better Auth

A ledger file holds only categories, transactions, templates and the keys of saved entries, with the schema version in `PRAGMA user_version`. The old login tables, the Drizzle migration table and the review views are not carried over. The old file is imported into a new file, never changed in place.

## 2026-10-12 — Plain HTTP and JSON, no WebSocket

The family mostly reads and rarely writes at the same time, so nothing needs live updates. A screen loads fresh data when it opens.

## 2026-10-12 — Nothing entered is lost

Each new transaction carries a random key made on the phone. The server saves the transaction and its key together and returns the stored transaction for a key it has seen. A new transaction made offline waits on the phone and is sent when the connection returns. Edits and deletes need a connection.

## 2026-10-12 — Many readers, one writer per ledger

Each ledger opens in WAL mode with a pool of reading connections and exactly one writing connection. Foreign keys are switched on for every connection; the old app never did, so a category delete could have left transactions without a category.

## 2026-10-12 — One language per instance

The instance sets German or English for the text and for the format of numbers, amounts and dates. The browser language is ignored, so a screen never mixes English words with German numbers.

## 2026-10-12 — The interface stays the same, with few deliberate changes

The family is used to the interface; `docs/parity.md` lists every behaviour and is the final test. Deliberate changes: every delete takes two taps on the same button; category merge is dropped (it was never built); the month pie chart is dropped until the charts are redesigned; charts are drawn as plain SVG without a library.

## 2026-10-12 — Production deploys only release tags

A release is a git tag `vX.Y.Z` on `main`; the rewrite starts at `v3.0.0`. rivendell pins the stack to one tag and passes the same tag as the `VERSION` build argument, because herald fetches a tag into an existing clone without a local tag ref, so `git describe` in the build cannot see it. A version file was rejected: the tag is the single source.

## 2026-10-12 — Strict security headers

Every response carries a Content Security Policy that allows only the app's own files and forbids framing, plus `X-Frame-Options: DENY`, `nosniff`, a same-origin referrer and HSTS behind HTTPS. The interface uses no inline script or style, so the policy needs no exceptions.
