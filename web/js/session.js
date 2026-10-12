// Who is signed in and which ledger they use: loads GET /api/session,
// picks the ledger (an account with one ledger never chooses), logs out.
import { store } from './state.js';
import * as api from './api.js';
import { chooseLedger, refresh } from './data.js';
import { go } from './nav.js';

export async function loadSession() {
  try {
    const session = await api.session();
    store.set({ session, lang: session.lang });
    const ids = (session.ledgers ?? []).map((l) => l.id);
    const { ledger } = store.state;
    if (!ids.includes(ledger)) chooseLedger(ids.length === 1 ? ids[0] : null);
    refresh();
  } catch {
    // 401: api.js cleared the session. Offline: keep the one from last time.
  }
  store.set({ booting: false });
}

export async function logout() {
  try {
    await api.logout();
  } catch {
    // Offline the cookie stays; signing out locally still hides the data.
  }
  chooseLedger(null);
  store.set({ session: null });
  go('/');
}
