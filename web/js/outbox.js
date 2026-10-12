// The outbox: every new transaction waits in IndexedDB ({key, ledger, body})
// until the server answered it. It leaves on 2xx. On a network error, a 401
// or a 5xx it stays and is sent again on start, on the "online" event and
// after each answered request. On any other 4xx the form that is submitting
// it shows why and keeps the values, so it leaves; an entry nobody is
// submitting right now (sent later, after offline) stays, marked refused
// with the server's reason, until someone fixes or discards it. Nothing
// entered disappears without the family seeing it.
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
// what waits and what was refused.
export async function refresh() {
  const entries = await all();
  store.set({ waiting: entries.filter((e) => !e.refused), refused: entries.filter((e) => e.refused) });
}

// discard removes a refused entry for good.
export async function discard(key) {
  await run('readwrite', (s) => s.delete(key));
  await refresh();
}

const outcomes = new Map(); // key -> { transaction } or { error }, for submit()
const submitting = new Set(); // keys a submit() call waits for
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
    if (entry.refused) continue;
    try {
      const saved = await api.createTransaction(entry.ledger, entry.body);
      outcomes.set(entry.key, { transaction: saved });
      sent++;
    } catch (err) {
      if (!(err instanceof api.ApiError) || err.status === 401 || err.status >= 500) break;
      if (!submitting.has(entry.key)) {
        const refused = { status: err.status, message: err.message, field: err.field };
        await run('readwrite', (s) => s.put({ ...entry, refused }));
        continue;
      }
      outcomes.set(entry.key, { error: err });
    }
    await run('readwrite', (s) => s.delete(entry.key));
  }
  return sent;
}

// submit puts a new transaction into the outbox and sends it. It answers
// { transaction } when saved, { error } when refused, {} when it waits.
export async function submit(ledger, body) {
  submitting.add(body.key);
  try {
    await run('readwrite', (s) => s.put({ key: body.key, ledger, body }));
    await refresh();
    await flush();
  } finally {
    submitting.delete(body.key);
  }
  const outcome = outcomes.get(body.key) ?? {};
  outcomes.delete(body.key);
  return outcome;
}
