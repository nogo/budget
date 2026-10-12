// The UI's one store: every component renders from it. Server data lives
// here and nowhere else; components keep only drafts and open/closed state.
import { AurilElement, Store } from '../auril/index.js';

export const store = new Store({
  session: null, // GET /api/session answer, kept for an offline start; null when signed out
  lang: 'de', // the instance language last seen, so the login screen speaks it
  ledger: null, // id of the chosen ledger
  booting: true, // until the first session answer, or its failure, arrived
  route: { name: 'month', ym: '' }, // the screen: name plus ym, id, q, year, month, categories as the path gives them
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  waiting: [], // outbox entries not sent yet, every ledger: { key, ledger, body }
  refused: [], // outbox entries the server refused: { key, ledger, body, refused: { status, message, field } }
  retry: null, // key of a refused entry to load into the form for a fix
  categories: null, // of the chosen ledger, by id; null until loaded
  templates: null, // of the chosen ledger, by day then id
  transactions: null, // { key, items, error } for the month list or search the route shows
  transaction: null, // the transaction in the form for /YYYY-MM/{id}
  review: null, // { key, rows, error } for the review page the route shows
  updateReady: false, // a new service worker waits for "update now"
}, { persist: ['session', 'lang', 'ledger'], key: 'budget', version: 1 });

AurilElement.store = store;

// ledgerName is the name of the chosen ledger, or ''.
export function ledgerName(state = store.state) {
  return state.session?.ledgers?.find((l) => l.id === state.ledger)?.name ?? '';
}
