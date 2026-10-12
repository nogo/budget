// The outbox: every new transaction waits in IndexedDB ({key, ledger, body})
// until the server answered it. It leaves on 2xx, or on 4xx (the form shows
// why); on a network error, a 401 or a 5xx it stays and is sent again on
// start, on the "online" event and after each answered request.
import { store } from './state.js';
import * as api from './api.js';

const db = new Promise((resolve, reject) => {
  const open = indexedDB.open('budget', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('outbox', { keyPath: 'key' });
  open.onsuccess = () => resolve(open.result);
  open.onerror = () => reject(open.error);
});

async function run(mode, op) {
  const tx = (await db).transaction('outbox', mode);
  const req = op(tx.objectStore('outbox'));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

const all = () => run('readonly', (s) => s.getAll());

// hooks.sent runs after a flush that saved at least one entry.
export const hooks = { sent: () => {} };

// refresh copies the outbox into the store, so lists and the top bar show
// what waits.
export async function refresh() {
  store.set({ waiting: await all() });
}

const outcomes = new Map(); // key -> { transaction } or { error }, for submit()
let running = null;
let again = false;

// flush sends every waiting entry, oldest first, and stops at the first
// that can't reach the server. Calls during a flush make it run once more.
export function flush() {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let sent = 0;
    do {
      again = false;
      sent += await sendAll();
    } while (again);
    await refresh();
    if (sent > 0) hooks.sent();
  })().finally(() => { running = null; });
  return running;
}

async function sendAll() {
  let sent = 0;
  for (const entry of await all()) {
    try {
      const saved = await api.createTransaction(entry.ledger, entry.body);
      outcomes.set(entry.key, { transaction: saved });
      sent++;
    } catch (err) {
      if (!(err instanceof api.ApiError) || err.status === 401 || err.status >= 500) break;
      outcomes.set(entry.key, { error: err });
    }
    await run('readwrite', (s) => s.delete(entry.key));
  }
  return sent;
}

// submit puts a new transaction into the outbox and sends it. It answers
// { transaction } when saved, { error } when refused, {} when it waits.
export async function submit(ledger, body) {
  await run('readwrite', (s) => s.put({ key: body.key, ledger, body }));
  await refresh();
  await flush();
  const outcome = outcomes.get(body.key) ?? {};
  outcomes.delete(body.key);
  return outcome;
}
