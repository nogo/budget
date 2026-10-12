# Interface between server and browser

The contract the Go server and the auril.js interface both build against. Change it here in the same change as the code.

## Layout

```
cmd/budget/        wiring and subcommands: serve, import, new
internal/ledger/   one ledger file: schema, open, queries, search, review, entry keys
internal/importer/ old app database -> clean ledger file
internal/access/   the access file: which account may open which ledger
internal/auth/     OpenID Connect login, session cookie, development login
internal/server/   HTTP routes, JSON handlers, static files
web/               index.html, style.css, js/, auril/ (vendored), sw.js, manifest.json, img/
```

## Configuration (environment)

| Variable | Meaning | Default |
|---|---|---|
| `BUDGET_ADDR` | listen address | `:4000` |
| `BUDGET_BASE_URL` | public URL, used for the OIDC redirect | `http://localhost:4000` |
| `BUDGET_DATA` | directory with the ledger files and `access.json` | `./data` |
| `BUDGET_ACCESS` | path of the access file | `$BUDGET_DATA/access.json` |
| `BUDGET_LANG` | `de` or `en` | `de` |
| `BUDGET_CURRENCY` | ISO 4217 code | `EUR` |
| `BUDGET_SESSION_SECRET` | at least 32 bytes; signs the session cookie | required |
| `OIDC_ISSUER` | issuer URL, discovery at `/.well-known/openid-configuration` | |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | client registered at the provider | |
| `BUDGET_DEV_ACCOUNT` | development only: log in as this account without OIDC | |

Exactly one of `OIDC_ISSUER` and `BUDGET_DEV_ACCOUNT` must be set; the server refuses to start otherwise. The development login logs a warning at start.

## Access file

```json
{
  "ledgers": [
    { "id": "household", "name": "Haushalt", "file": "household.sqlite" },
    { "id": "annabel", "name": "Annabel", "file": "annabel.sqlite" }
  ],
  "accounts": {
    "danilo": ["household", "annabel"],
    "anna": ["household"]
  }
}
```

An account key is the OIDC `sub` claim. `file` is relative to `BUDGET_DATA`. The server rereads the file when its modification time changes, so an edit takes effect without a restart. Ledger ids match `^[a-z0-9-]+$`.

## Ledger file

```sql
CREATE TABLE categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  has_notes INTEGER NOT NULL DEFAULT 0 CHECK (has_notes IN (0, 1))
);
CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK (amount > 0),
  type        TEXT    NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  date        INTEGER NOT NULL CHECK (date % 86400 = 0),  -- midnight UTC of the day
  note        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX transactions_date_idx ON transactions (date);
CREATE INDEX transactions_category_idx ON transactions (category_id);
CREATE TABLE templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK (amount >= 0),
  type        TEXT    NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  day         INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  note        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX templates_category_idx ON templates (category_id);
CREATE TABLE entry_keys (
  key            TEXT    PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  created_at     INTEGER NOT NULL
);
PRAGMA user_version = 1;
```

Every connection sets `journal_mode=WAL`, `foreign_keys=ON` and `busy_timeout=5000`. Writes go through one connection; reads use a pool. The server refuses a file whose `user_version` is not 1.

## Commands

- `budget serve` — run the server.
- `budget import <old.sqlite> <new.sqlite>` — read an old app database (read-only) and write a clean ledger file. Refuses an existing target. Converts each date to midnight UTC of its Europe/Berlin day. Afterwards it compares per day, per type: count and sum of amounts, old against new, and fails on any difference. Prints counts.
- `budget new <new.sqlite>` — create an empty ledger file.

## HTTP

Everything under `/api/` answers JSON and needs a session. Without a session: `401`. A ledger the account may not open: `403`. Writes must send `Content-Type: application/json`; otherwise `415`. Errors are `{"error": "message", "field": "amount"}`; `field` only when one input is at fault. Messages are in the instance language.

Dates are `"YYYY-MM-DD"`. Months are `"YYYY-MM"`. Amounts are numbers with at most two decimals; the server rounds to cents.

### Login

- `GET /auth/login` — redirect to the provider (authorization code flow with PKCE, `state` and `nonce`). In development mode it sets the session directly and redirects to `/`.
- `GET /auth/callback` — finish the login, set the session cookie, redirect to `/`.
- `POST /auth/logout` — clear the session cookie; `204`.

The session cookie is `HttpOnly`, `Secure` (except on `http://localhost`), `SameSite=Lax`, signed with HMAC-SHA256, and holds the account and an expiry 90 days ahead, renewed on use.

### Session

`GET /api/session` → `{"account": "danilo", "lang": "de", "currency": "EUR", "version": "3.0.0", "ledgers": [{"id": "household", "name": "Haushalt"}]}`

Without a session it answers `401` with `{"error": "…", "lang": "de"}`, so the login screen speaks the instance language.

### Ledger routes

All under `/api/ledgers/{ledger}`.

| Method and path | Body | Answer |
|---|---|---|
| `GET /transactions?month=YYYY-MM&q=…` | | `[Transaction]`, newest date first, then highest id first |
| `GET /transactions/{id}` | | `Transaction` or `404` |
| `POST /transactions` | `{key, amount, type, categoryId, date, note}` | `201 Transaction`; a known `key` returns `200` with the stored transaction |
| `PUT /transactions/{id}` | `{amount, type, categoryId, date, note}` | `200 Transaction` |
| `DELETE /transactions/{id}` | | `204` |
| `GET /categories` | | `[Category]` by id |
| `POST /categories` | `{name, hasNotes}` | `201 Category`; duplicate name `409` |
| `PUT /categories/{id}` | `{name, hasNotes}` | `200 Category` |
| `DELETE /categories/{id}` | | `204`; still used by a transaction or template `409` |
| `GET /templates?category=ID` | | `[Template]` by day, then id; all when `category` is absent |
| `GET /templates/{id}` | | `Template` |
| `POST /templates` | `{amount, type, categoryId, day, note}` | `201 Template` |
| `PUT /templates/{id}` | same | `200 Template` |
| `DELETE /templates/{id}` | | `204` |
| `GET /review/years?categories=1,2` | | `[{year, income, expense}]`, oldest year first |
| `GET /review/{year}?categories=1,2` | | `[{month, income, expense}]`, months with data only, January first |
| `GET /review/{year}/{month}` | | `[{categoryId, category, income, expense}]` by category id, categories with data only |

```
Transaction = {id, amount, type, categoryId, category, date, note}
Category    = {id, name, hasNotes}
Template    = {id, amount, type, categoryId, category, day, note}
```

Review sums are rounded to cents. `total` is not sent; the browser computes income minus expense.

### Validation

- `amount`: transaction greater than 0, template 0 or more; at most 1 000 000 000.
- `type`: `expense` or `income`.
- `categoryId`: an existing category.
- `date`: a real calendar day.
- `day`: 1 to 31.
- `note`, `name`: trimmed; at most 500 characters; `name` not empty.
- `key`: 8 to 64 characters of `[A-Za-z0-9-]`.

### Search (`q`)

Same as the old app (`src/lib/query.ts` at version 2.4.0):

- `#word` — categories whose name contains `word`, case-insensitive, Unicode letters and digits; several `#` terms combine as "any of". A `#word` that matches no category matches nothing.
- `=12,50` or `=12.50` or `=12` — amount equals, compared in cents; several combine as "any of".
- Remaining words — every word must appear in the note, case-insensitive.
- With remaining words, all months are searched. With only `#` and `=` terms, only `month` is searched.

### Static files

`GET /` and any other path without a dot that is not under `/api/` or `/auth/` answers `index.html`, so the browser's own routes work on reload. Static files are embedded in the binary. `index.html` and `sw.js` are sent with `Cache-Control: no-cache`.

## Browser routes

| Path | Screen |
|---|---|
| `/` | current month |
| `/YYYY-MM` | that month; `?q=` search |
| `/YYYY-MM/{id}` | that month with transaction `id` in the form |
| `/templates`, `/templates/{id}` | templates |
| `/categories`, `/categories/{id}` | categories, one in edit |
| `/review`, `/review/YYYY`, `/review/YYYY/M` | review; `?categories=1,2` |
| `/ledgers` | ledger choice |

The chosen ledger is kept in `localStorage`. An account with one ledger never sees the choice.

## Offline

- The service worker precaches the app shell and never caches `/api/` or `/auth/`. The server fills in its file list and a cache name hashed from the files when it serves `sw.js`, so every change to the app installs a new worker.
- Categories and templates of each ledger are kept in `localStorage` after every successful load, so the form works offline.
- A new transaction goes into an IndexedDB outbox (`{key, ledger, body}`) before it is sent. It leaves the outbox on `2xx`, or on a `4xx` other than `401` (the form shows the error). On a network error, `401` (session expired) or `5xx` it stays. The outbox is sent on start, on the `online` event and after each successful request. The top bar shows "offline" and the number of waiting entries; waiting entries appear in the month list marked as waiting.
