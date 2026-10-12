# auril.js

A no-build frontend kernel for personal apps to kill the bloat.
Plain ES modules over web standards: **495 lines of kernel you own** (typed
via JSDoc), plus one vendored file (Idiomorph) for DOM morphing. No npm, no
bundler, no transpilation — the files that ship are the files you wrote.

This file is the complete documentation. It is deliberately short enough to
paste into an AI session as context — keep it that way.

## The Guardrail

auril.js stays useful only while it stays small. These rules ARE the framework;
breaking them is how every personal framework has died — by growing into the
bloat it was built to escape.

1. **Two-app rule.** Nothing enters the kernel until at least **two** apps
   need it *today*. Until then it lives in the app that wants it.
2. **Hard size budget: 600 lines** for the kernel (top-level `src/*.js`,
   excluding `src/vendor/`, `test/`, `examples/`, `bench/` — check:
   `wc -l src/*.js`; currently 515).
   To cross it, delete something first. No subfolders inside `src/` — that
   is how creep starts.
3. **Near-frozen.** Bug fixes are always welcome. Features must pass the
   checklist below — the default answer is **no**.
4. **App code stays in apps.** API layers, formatting helpers, components —
   never generalize them "for later".
5. **Vendored, pinned, never published.** Apps copy the kernel via
   `vendor.sh` and upgrade deliberately. No registry, no auto-update.
6. **This file is the contract.** Every kernel change updates FRAMEWORK.md in
   the same commit and adds a Versions entry. Undocumented = nonexistent.

Feature checklist — all must be yes:

- [ ] Needed by two or more apps **today** (not hypothetically)?
- [ ] Impossible or genuinely awkward with the platform alone?
- [ ] Under ~50 lines including comments?
- [ ] Understandable in one reading?
- [ ] FRAMEWORK.md updated in the same change?

## Design principles

- **No build step.** Files ship as written; the debugger shows your source;
  stack traces end in code you own.
- **Platform first.** `<dialog>`, `popover`, `:has()`, CSS nesting, form
  validation, View Transitions — reach for these before any JS. The kernel
  stays empty of what the platform already does.
- **Build for priors.** APIs mirror established idioms — lit-html's
  `` html`` ``, Redux's `subscribe`, htmx's `morph` — so humans *and* AI
  models can lean on what they already know. Only the deltas need docs.
- **One store, light DOM, morphed strings.** Components read shared state,
  render HTML strings, and morph the live DOM. No virtual DOM, no shadow DOM,
  no props plumbing.

## Modules

### html.js — `` html`` ``, `raw()`, `escapeHtml()`

Tagged template returning an HTML string. Interpolated values are
**escaped by default**; arrays join; `null`/`undefined`/`false` render as
nothing (`0` renders). Nested `` html`` `` results are *not* re-escaped, so
composition just works:

```js
const row = (t) => html`<li id="tx-${t.id}">${t.note}</li>`;
const list = html`<ul>${transactions.map(row)}</ul>`;
```

`raw(str)` marks trusted markup (e.g. rendered markdown). Never wrap user
input in `raw()`. Trust is carried by a `Symbol.for('auril.raw')` brand rather
than `instanceof`, so two vendored copies of the kernel on one page compose
instead of double-escaping across the seam.

Because `0` renders, guard lists with a real boolean: `items.length > 0 && …`.
`items.length && …` prints a bare `0` when the list is empty.

### morph.js — `morph(target, content, options?)`

Morphs `target`'s children to match an HTML string (Idiomorph,
`morphStyle: 'innerHTML'`). Non-destructive: preserves focus, selection,
scroll, and node identity. The **value of the field being typed into is never
overwritten**: re-rendering on every keystroke can't wipe text, jump the
cursor, or break IME composition; the value resyncs from markup once the input
blurs. `ignoreActiveValue` is passed to Idiomorph **only while an input,
textarea or contenteditable holds focus**, because it skips the focused
element's whole subtree rather than just its value — left on unconditionally,
a focused `<button>` keeps the label it had before the click that changed it.
Force it either way with an explicit `ignoreActiveValue` in `options`. Two
rules:

- Give list items **stable `id` attributes** (`id="tx-42"`) so reorders pair
  nodes correctly.
- Exempt self-managed regions (contenteditable, third-party widgets):
  `morph(el, content, { callbacks: { beforeNodeMorphed: (node) => node.id !== 'editor' } })`

### element.js — `AurilElement`

Custom-element base class. Assign the shared store **once** at startup:
`AurilElement.store = new Store({...})`.

```js
class MonthlyList extends AurilElement {
  onConnect() {                       // called on connect; cleanup in onDisconnect()
    this.watch((s) => s.yearMonth, () => this.update());  // re-render when slice changes
  }
  render() { return html`...`; }      // if defined, runs once on connect
}
customElements.define('monthly-list', MonthlyList);
```

- `this.on(target, type, handler, opts?)` — `addEventListener` auto-removed on
  disconnect (AbortController under the hood; `this.signal` is exposed). A
  caller-provided `opts.signal` is combined via `AbortSignal.any` — either
  signal removes the listener.
- `this.delegate(type, selector, handler, opts?)` — event delegation scoped to
  this element, auto-removed on disconnect (same `opts.signal` merge as `on()`).
  Prefer it over bare `delegate(this, …)` so listeners die with the element.
- `this.watch()` — re-render (`update()`) on **any** store change.
- `this.watch(cb)` — `cb(state)` on any store change.
- `this.watch(selector, cb)` — `cb(slice, state)` only when the selected
  slice changes (`===` comparison). For re-render-on-slice:
  `this.watch((s) => s.yearMonth, () => this.update())`.
- `this.update()` — `morph(this, this.render())`. **Memoized**: when render()
  output is string-identical to the previous update, the morph is skipped
  entirely — coarse `watch()` subscriptions cost one string compare, not a tree
  walk. The memo resets on reconnect. Corollary: don't mutate a component's DOM
  outside render(); a skipped morph won't repair it.
- A failing `render()` is passed to `reportError()` wrapped with the tag name
  (original error on `.cause`) and **never rethrown**. Rethrowing behaved
  differently per call path: it escaped `connectedCallback` uncaught, but on the
  store-driven path it landed in `Store`'s per-subscriber catch and only
  produced a second log line. `reportError` reaches `window.onerror` from both.
- `on()`, `delegate()`, and `watch()` throw when called before connect **or
  after disconnect** — call them from `onConnect()`, never the constructor and
  never from an async callback that may land after the element is gone. The
  aborted-signal case matters because `addEventListener` with an already-aborted
  signal is a silent no-op.

Light DOM only — global CSS applies; no shadow root.

### store.js — `Store`

```js
const store = new Store(
  { yearMonth: '2026-06', transactions: [] },        // defaults
  { persist: ['yearMonth'], key: 'budget-store', version: 1 }, // persisted slice; bump version to drop stale data
);
store.set({ yearMonth: '2026-07' });                 // patch
store.set((s) => ({ count: s.count + 1 }));          // functional patch
const unsub = store.subscribe((state) => ...);
```

Notifications are **batched per microtask**: N synchronous `set()` calls →
one notify with the final state; a subscriber that throws is caught and logged
so it never blocks the rest of the batch. Persisted keys are hydrated on
construction and written **once per microtask batch** (same cadence as
notifications); storage failures (quota, tests) degrade silently to in-memory.
An optional `version` discards incompatible saved data (defaults win) instead
of hydrating a stale shape — migrations stay app code; without it the payload
stays flat, so existing apps keep their stored data.
Persisted slices also sync **across tabs**: a `storage` event from another tab
re-applies the saved keys (last write wins; non-persisted keys untouched), so
two open tabs stay in step. Only keys whose value *actually differs* are
patched — the writing tab gets no event of its own, but a blind patch would
still bounce (B adopts A's write, persists it, A receives it back), and because
`JSON.parse` returns fresh references a `!==` check would fire every subscriber
on every event. `store.destroy()` detaches the listener; apps rarely need it,
tests and hot-swapped modules do.

Design constraint: the public API (`state` getter, `set`, `subscribe`,
microtask-batched notify) is kept swappable to a future native-signals backend
(TC39 Signals, **Stage 2** since late 2025 and moving toward Stage 3). Don't add
store API surface a `Signal.State`-based implementation couldn't honor — e.g. no
synchronous notification guarantees.

### router.js — `Router`

Client-side router built on the **Navigation API** and **URLPattern**
(`:param` and `*` syntax) — both Baseline newly available 2026 (Chrome 102+,
Firefox 147+, Safari 26.2+); no fallback. Wraps route changes in a View
Transition when supported, unless constructed with `viewTransitions: false`.

```js
new Router()
  .route('/v/:vault/', ({ vault }) => show('home', { vault }))
  .route('/v/:vault/review/:year', ({ vault, year }) => show('review', { vault, year }))
  .route('/search', (_, url) => show('search', { q: url.searchParams.get('q') }))
  .notFound((url) => show('missing', { path: url.pathname }))
  .start();                            // also intercepts same-origin link clicks
router.go('/v/personal/');             // programmatic navigation
```

Handlers receive `(params, url)`. Routes match on **`url.pathname` only** —
query state comes off `url.searchParams`, and a query-only change re-runs the
matching handler.

One `navigate` listener intercepts same-origin navigations — link clicks,
back/forward, and `go()`. Hash-only changes, downloads, **POST** form
submissions, cross-origin navigations, and modified clicks are left to the
browser via the platform's navigate-event flags rather than hand-rolled checks.
GET form submissions are ordinary same-origin navigations and stay routed. An
unmatched path with no `notFound` handler falls through to a real browser
navigation. `start()` takes no options and throws if called twice.

Intercepted route changes are wrapped in a View Transition when supported, and
the intercept handler awaits it — `startViewTransition` runs its callback in a
*later* frame, so a handler that returned immediately would let the Navigation
API restore scroll and reset focus against the pre-update DOM. The initial
resolve in `start()` runs bare: a transition there would cross-fade from a blank
page and cost a frame before first paint.

`new Router({ viewTransitions: false })` applies every route change directly,
without `startViewTransition`; the option defaults to `true`. Reach for it when
no navigation may be lost: while a View Transition runs, clicks don't reach the
page, and `::view-transition { pointer-events: none }` does not change that.

### delegate.js — `delegate(root, type, selector, handler, opts?)`

Event delegation: `handler(event, matchedElement)` when the event target
matches `selector` inside `root`. Non-bubbling events (`focus`, `blur`,
`mouseenter`, `mouseleave`) never reach `root` in the bubble phase — pass
`{ capture: true }` for those.

### dev.js — `dev`

`dev.log(...)` prints `[auril]`-prefixed debug output when enabled — store
patches, route resolutions, and `AurilElement` connect / disconnect / update
cycles (useful for spotting re-render storms). When dev is enabled each `Store`
also registers itself at `globalThis.__auril[key]`, so the console can poke live
state: `__auril['auril-todos'].state`. Enable with `?auril-dev` in the URL or
`dev.enabled = true` at startup.

## Conventions

- All server data flows through one per-app `api.js`; components never
  `fetch` directly. (This seam is where offline-first slots in later.)
- **Component-local state** (open/closed, edit mode, drafts): private instance
  fields + `this.update()`. The store is for *shared* state only.
  ```js
  #editingId = null;
  startEdit(id) { this.#editingId = id; this.update(); }
  ```
- Stable `id`s on anything morph must track across renders.
- **Keep one component's rendered tree under ~250 nodes.** Morph cost tracks
  tree size, not change size (see Benchmarks), so a 1000-node component pays
  ~30 ms per update under a 4× throttle whether one row changed or all of them.
  Split a large view into several components with `watch(selector, cb)`: each
  morph then walks a small tree, and the ones whose slice did not change never
  morph at all. This is the reason the fan-out tax is worth paying.
  `examples/dbmonster/` breaks this rule on purpose — it is a stress test, and
  it says so; every other example stays under the ceiling.
- `raw()` only at trusted edges (markdown renderer output) — never user input.
- **Always quote interpolated attribute _values_**: `class="${x}"`, not
  `class=${x}`. `` html`` `` escapes `&<>"'` but not spaces or `=`, so an
  unquoted value is an injection vector its escaping cannot close. The single
  exception is a boolean-attribute *flag* assembled from literals —
  `<input type="checkbox" ${done ? 'checked' : ''}>` — where the interpolated
  text can never originate in data. If it can, it goes in quotes.
- Guard optional markup with a real boolean: `items.length > 0 && html\`…\``.
  `items.length && …` renders a bare `0` for an empty list.
- Inside an `AurilElement`, use `this.delegate()` (or pass `{ signal: this.signal }`
  to bare `delegate()`) so listeners die on disconnect — bare `delegate(this, …)`
  re-binds and stacks listeners on every reconnect.
- Modals, menus, tooltips: `<dialog>` and `popover` — zero kernel code. Wire the
  buttons with `command` / `commandfor` (Invoker Commands, Baseline 2026) rather
  than a click handler.
- Scoped component CSS: `@scope` (Baseline 2026) confines styles to a subtree in
  light DOM, and its `to` limit stops them leaking into nested components —
  something no naming convention can express. This is the platform's answer to
  shadow-DOM encapsulation, and it costs the kernel nothing.
- Forms: native validation (`required`, `:user-invalid`) before JS.
- **Controlled inputs** — the canonical form for inputs that write to the
  store on keystroke (search boxes, live filters): bind the value in markup —
  `value="${s.query}"` — and update via
  `this.delegate('input', '.search', (_, el) => store.set({ query: el.value }))`.
  The binding keeps the input correct across re-renders while blurred;
  `ignoreActiveValue` keeps typing safe while focused. An *unbound* input in
  a re-rendering region is a bug: morph clears its value on the next render
  after blur.

## Vendoring into an app

```sh
./vendor.sh ../app/web/auril
```

`src/` is the self-contained vendored unit: its contents (kernel +
`vendor/idiomorph.js`) are copied verbatim, plus this file (the pinned copy
records its version below) and `LICENSE` (MIT — the notice travels with
copies). Apps import `./auril/index.js`. Upgrade by re-running deliberately —
diff the result like any dependency bump.

## DX: types without a build step

The kernel ships **JSDoc type annotations inside the `.js` files** — they
travel with vendoring and cost zero at runtime (nothing transpiles). With the
repo's `jsconfig.json` (strict `checkJs`), any TS-aware editor gives
autocomplete, signature help, and shape-checking; `Store` is generic, so
`new Store({ filter: '', todos: [] })` types `store.state` and every
`set()` patch against your actual state shape.

Verify headlessly (dev-time only; typescript is fetched on demand, never a
project dependency): `bunx tsc -p jsconfig.json`. Apps that vendor the kernel
add their own ~10-line `jsconfig.json` to get the same checking.

Headless DOM tests (`element.js`, `delegate.js`) use happy-dom via a dev-only
`devDependency` and a `test/setup.js` preload (`bunfig.toml`). Like `typescript`,
it is a dev tool only — never a runtime dependency, never vendored (`vendor.sh`
copies `src/`, this file, and `LICENSE`). `router.js` and `morph.js` stay
untested headless: happy-dom has no Navigation API or URLPattern. That is a
limit of *headless* testing, not of testing — `bench/run.js` already drives a
real browser and is where those tests belong.

`src/vendor/idiomorph.d.ts` is a hand-written declaration file, not generated.
Idiomorph writes its JSDoc in Closure style (`function(X): Y`), which TypeScript
7 cannot parse, and `jsconfig.json`'s `exclude` cannot help because `morph.js`
imports the file. A sibling `.d.ts` takes precedence over the `.js`, so the
source is never parsed — `bunx tsc -p jsconfig.json` is clean with zero
exceptions. It also gives `morph()`'s `options` a real type instead of `any`.
Re-check it when bumping Idiomorph.

`AurilElement.store` is typed `Store<any>`, so `this.watch((s) => s.todos, …)`
sees `s` as `any`. For a fully typed selector and slice, close over the concrete
store instead of routing through the static field — the generic flows through:

```js
import { store } from './store.js';            // your Store<{ todos: Todo[] }>
this.watch(() => store.state.todos, (todos) => { /* todos: Todo[] */ });
```

This is a **typing trick only**. `watch()` always subscribes to
`AurilElement.store`; the closed-over `store` merely supplies the types. It is
correct exactly when that import *is* the instance assigned to the static. With
two stores in one app, the selector would read one and the subscription would
fire on the other's cadence — use `store.subscribe()` directly for the second
store and unsubscribe on `this.signal`'s `abort`.

`watch()`'s JSDoc `@overload`s already type each arity (no-arg, `cb`,
`selector + cb`). Naming the tag `html` also lets editors with a lit / inline-html
extension highlight and format the template literals (editor-dependent).

## Benchmarks

```sh
bun run bench                     # 4x CPU throttle, writes bench/results.json
bun bench/run.js --throttle=1     # unthrottled
```

`bench/run.js` drives the **system Chrome** through `playwright-core` (~5 MB, no
browser download; dev-only, never vendored); `bench/index.html` also runs
standalone under `bun serve.js`. Three scenarios: wide update, narrow update,
fan-out.

The four measured results that constrain how components are written:

1. `render()` is **2–3 % of an update**. `update()`'s string memo skips the
   *morph*, not the render — never weaken it, never optimise `render()`.
2. **Morph cost tracks tree size, not change size** — a one-row change costs
   84–97 % of changing every row, and **86–90 % of morph is the tree walk**, not
   the HTML parse. Together these are the basis for the ~250-node ceiling in
   Conventions: the walk runs in full regardless, so the only lever is a smaller
   tree. Any "the change is small so the morph is cheap" argument is invalid.
3. Morph costs **5–7× `innerHTML`**, which is the price of keeping node identity
   and focus — `innerHTML` measurably loses both. Not a reason to switch.
4. The fan-out tax is **~1.4 µs per idle subscribed component**. Negligible;
   bare `watch()` needs no optimisation and no convention.

Full numbers, methodology, closed decisions, and revisit triggers live in
[PERFORMANCE.md](./PERFORMANCE.md). Do not re-argue any of the four without
re-running the bench.

## Using with AI

Reference this file in the app's CLAUDE.md (or paste it at session start) —
it is the framework's entire context, ~4k tokens. Watch that number: this file
earns its place by being pasteable, and rule 6 ("undocumented = nonexistent")
pushes it upward on every change. Detail that is *research* rather than
*contract* belongs in PERFORMANCE.md or ALTERNATIVES.md, which nobody needs in
context to write a component.

The implementation is small enough that the model should **read the kernel
files directly** instead of guessing: everything is within a few hundred lines.
`examples/todos/app.js` is the canonical usage reference — a complete todo app
(CRUD, inline editing, filters, persistence, search-as-you-type) showing every
kernel piece and the local-state convention in ~180 lines.

## Versions

- **Idiomorph (vendored)**: v0.7.4 (`src/idiomorph.js` at tag v0.7.4,
  2025-09-29, Zero-Clause BSD). Only local change: trailing
  `export {Idiomorph};`. Upgrade by replacing the file from the tag and
  re-appending the export, then re-checking `src/vendor/idiomorph.d.ts` (see
  DX below) against the file's own typedefs. v0.7.x uses `Element.moveBefore()` where available
  (Chrome 133+), falling back to `insertBefore` — so list reorders preserve
  iframe content, running animations, and focus, and do not fire
  disconnect/reconnect on nested custom elements.
- **Kernel, 2026-08**: `Router` handlers take `(params, url)` and the intercept
  handler awaits the View Transition; the initial resolve no longer transitions;
  `start()` throws on a second call. `AurilElement` reports render failures via
  `reportError` instead of rethrowing, and its connect-scoped methods now also
  throw after disconnect. `Store` gained `destroy()` and only patches cross-tab
  keys whose value actually changed. `` html`` `` brands trusted markup with
  `Symbol.for('auril.raw')`. Added `src/vendor/idiomorph.d.ts` and `bench/`.
  Kernel: 495/600 lines.
- **Kernel, 2026-08 (fix)**: `morph()` no longer asks for `ignoreActiveValue`
  unconditionally. Idiomorph skips the *whole subtree* of `document.activeElement`
  under that flag, so any control that relabels itself on click — a toggle, an
  effort cycle, a two-tap delete confirmation — kept its stale text until focus
  moved elsewhere, while the write behind it had already landed. It is now asked
  for only when an input, textarea or contenteditable is focused, which is the
  only case that has a value to protect. Two tests in `test/element.test.js`
  cover both halves. Kernel: 504/600 lines.
- **Kernel, 2026-09 (fix)**: `new Router({ viewTransitions: false })` applies
  route changes without a View Transition. While one runs, clicks don't reach
  the page, so a quick second navigation was lost; `::view-transition
  { pointer-events: none }` does not help. The default stays `true`.
  Kernel: 515/600 lines.
- **Kernel, 2026-10 (fix)**: the router no longer intercepts a reload
  (`navigationType === 'reload'`). Intercepted, `location.reload()` only
  re-ran the route, so a page never picked up the code a new service worker
  had just activated. First router tests (`test/router.test.js`).
  Kernel: 518/600 lines.

> Vendored from auril.js d3e2201 on 2026-10-12.
