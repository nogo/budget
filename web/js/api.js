// Every request to the server goes through here; components never fetch.
// It tracks whether the server is reachable, turns a 401 into the login
// screen, and keeps each ledger's categories and templates in localStorage
// so the transaction form works offline.
import { store } from './state.js';

// ApiError is an answer the server refused: status, message, and the field
// at fault when one is.
export class ApiError extends Error {
  constructor(status, message, field = '') {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// OfflineError is a request that never got an answer.
export class OfflineError extends Error {}

// hooks.success runs after every answered request; the app sends the
// outbox from it.
export const hooks = { success: () => {} };

async function request(method, path, body) {
  const init = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    if (store.state.online) store.set({ online: false });
    throw new OfflineError('offline');
  }
  if (!store.state.online && navigator.onLine) store.set({ online: true });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401) {
    store.set({ session: null, ...(data?.lang ? { lang: data.lang } : {}) });
    throw new ApiError(401, data?.error ?? 'unauthorized');
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.field ?? '');
  queueMicrotask(() => hooks.success());
  return data;
}

const ledgerPath = (ledger) => `/api/ledgers/${encodeURIComponent(ledger)}`;
const query = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));
  const s = q.toString();
  return s ? `?${s}` : '';
};
const ids = (list) => (list?.length ? list.join(',') : undefined);

// cached loads a list and keeps it in localStorage; offline it answers the
// kept copy.
async function cached(name, ledger, load) {
  const key = `budget.${name}.${ledger}`;
  try {
    const list = await load();
    try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* full storage: online still works */ }
    return list;
  } catch (err) {
    const kept = err instanceof OfflineError ? localStorage.getItem(key) : null;
    if (kept) return JSON.parse(kept);
    throw err;
  }
}

export const session = () => request('GET', '/api/session');
export const logout = () => request('POST', '/auth/logout', {});

export const transactions = (ledger, month, q) => request('GET', `${ledgerPath(ledger)}/transactions${query({ month, q })}`);
export const transaction = (ledger, id) => request('GET', `${ledgerPath(ledger)}/transactions/${id}`);
export const createTransaction = (ledger, body) => request('POST', `${ledgerPath(ledger)}/transactions`, body);
export const updateTransaction = (ledger, id, body) => request('PUT', `${ledgerPath(ledger)}/transactions/${id}`, body);
export const deleteTransaction = (ledger, id) => request('DELETE', `${ledgerPath(ledger)}/transactions/${id}`);

export const categories = (ledger) => cached('categories', ledger, () => request('GET', `${ledgerPath(ledger)}/categories`));
export const createCategory = (ledger, body) => request('POST', `${ledgerPath(ledger)}/categories`, body);
export const updateCategory = (ledger, id, body) => request('PUT', `${ledgerPath(ledger)}/categories/${id}`, body);
export const deleteCategory = (ledger, id) => request('DELETE', `${ledgerPath(ledger)}/categories/${id}`);

export const templates = (ledger) => cached('templates', ledger, () => request('GET', `${ledgerPath(ledger)}/templates`));
export const createTemplate = (ledger, body) => request('POST', `${ledgerPath(ledger)}/templates`, body);
export const updateTemplate = (ledger, id, body) => request('PUT', `${ledgerPath(ledger)}/templates/${id}`, body);
export const deleteTemplate = (ledger, id) => request('DELETE', `${ledgerPath(ledger)}/templates/${id}`);

export const reviewYears = (ledger, cats) => request('GET', `${ledgerPath(ledger)}/review/years${query({ categories: ids(cats) })}`);
export const reviewYear = (ledger, year, cats) => request('GET', `${ledgerPath(ledger)}/review/${year}${query({ categories: ids(cats) })}`);
export const reviewMonth = (ledger, year, month) => request('GET', `${ledgerPath(ledger)}/review/${year}/${month}`);
