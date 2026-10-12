// Loads what the shown screen needs from the server into the store. A
// screen loads fresh data when it opens; an answer that arrives after the
// screen moved on is dropped.
import { store } from './state.js';
import * as api from './api.js';
import { loadScreen } from './screens.js';

const latest = {}; // slice -> number of the newest request, to drop stale answers

async function load(slice, fetcher, apply) {
  const n = (latest[slice] = (latest[slice] ?? 0) + 1);
  try {
    const value = await fetcher();
    if (latest[slice] === n) store.set(apply(value, null));
  } catch (err) {
    if (latest[slice] === n && !(err instanceof api.ApiError && err.status === 401)) store.set(apply(null, err));
  }
}

// transactionsKey names the list the route shows, so a list of another
// month or search is never shown as this one.
export const transactionsKey = (s = store.state) => `${s.ledger}|${s.route.ym}|${s.route.q ?? ''}`;
export const reviewKey = (s = store.state) => `${s.ledger}|${s.route.year ?? ''}|${s.route.month ?? ''}|${s.route.categories?.join(',') ?? ''}`;

// reviewRows is the review the route shows with each row's total, or null
// while it loads.
export function reviewRows(s = store.state) {
  if (s.review?.key !== reviewKey(s)) return null;
  return { ...s.review, rows: s.review.rows.map((r) => ({ ...r, total: Math.round((r.income - r.expense) * 100) / 100 })) };
}

export function loadCategories() {
  const { ledger } = store.state;
  return load('categories', () => api.categories(ledger), (v) => (v ? { categories: v } : {}));
}

export function loadTemplates() {
  const { ledger } = store.state;
  return load('templates', () => api.templates(ledger), (v) => (v ? { templates: v } : {}));
}

export function loadTransactions() {
  const s = store.state;
  const key = transactionsKey(s);
  return load('transactions', () => api.transactions(s.ledger, s.route.ym, s.route.q), (items, error) => ({ transactions: { key, items: items ?? [], error } }));
}

// loadTransaction fetches the open transaction; the list's copy, when it
// has one, fills the form meanwhile.
export function loadTransaction() {
  const { ledger, route, transactions, transaction } = store.state;
  const known = transactions?.items.find((t) => t.id === Number(route.id));
  if (known && transaction?.id !== known.id) store.set({ transaction: known });
  return load('transaction', () => api.transaction(ledger, route.id), (v, error) => ({ transaction: v ?? { id: Number(route.id), error } }));
}

// gridKey names the heatmap the route shows: a year, or all years.
export const gridKey = (s = store.state) => `${s.ledger}|${s.route.year ?? ''}`;

// loadGrid fetches the category sums of the route's year and of the year
// before (for the comparison boxes), or of every year on /review.
export function loadGrid() {
  const s = store.state;
  const { ledger, route } = s;
  const key = gridKey(s);
  const fetcher = route.year
    ? () => Promise.all([api.reviewGrid(ledger, route.year), api.reviewGrid(ledger, route.year - 1)])
    : () => api.reviewGrid(ledger).then((cells) => [cells, null]);
  return load('grid', fetcher, (v, error) => ({ grid: { key, cells: v?.[0] ?? [], previous: v?.[1] ?? null, error } }));
}

export function loadReview() {
  const s = store.state;
  const { ledger, route } = s;
  const key = reviewKey(s);
  const fetcher = route.month
    ? () => api.reviewMonth(ledger, route.year, route.month)
    : route.year
      ? () => api.reviewYear(ledger, route.year, route.categories)
      : () => api.reviewYears(ledger, route.categories);
  return load('review', fetcher, (rows, error) => ({ review: { key, rows: rows ?? [], error } }));
}

// refresh loads everything the shown screen needs; each screen says what
// that is when it registers (screens.js).
export function refresh() {
  const { session, ledger, route } = store.state;
  if (!session || !ledger) return;
  loadScreen(route.name);
}

// chooseLedger switches to another ledger and drops the data of the last.
export function chooseLedger(id) {
  store.set({ ledger: id, categories: null, templates: null, transactions: null, transaction: null, review: null, grid: null });
}
