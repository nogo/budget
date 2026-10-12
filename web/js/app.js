// The budget interface: starts the router, the session and the outbox, and
// shows the screen the state asks for. Screens are swapped whole; each
// component renders itself from the store.
import { store } from './state.js';
import { hooks as apiHooks } from './api.js';
import { flush, refresh as refreshOutbox, hooks as outboxHooks } from './outbox.js';
import { refresh, loadTransactions } from './data.js';
import { startRouter } from './nav.js';
import { loadSession } from './session.js';
import { registerServiceWorker } from './update.js';
import { screenTag } from './screens.js';
import './topbar.js';
import './login.js';
import './ledgers.js';
import './month.js';
import './templates.js';
import './categories.js';
import './review.js';

function screenFor(s) {
  if (!s.session) return s.booting ? '' : 'login-screen';
  if (!s.ledger) return screenTag('ledgers');
  return screenTag(s.route.name);
}

const root = document.getElementById('app');
let shown = null;
function show(s) {
  document.documentElement.lang = s.lang;
  const tag = screenFor(s);
  if (tag === shown) return;
  shown = tag;
  root.replaceChildren(...(tag ? [document.createElement(tag)] : []));
  document.body.classList.toggle('signed-in', Boolean(s.session));
}
store.subscribe(show);

apiHooks.success = () => {
  if (store.state.waiting.length > 0) flush();
};
outboxHooks.sent = () => {
  if (store.state.route.name === 'month') loadTransactions();
};
addEventListener('online', () => {
  store.set({ online: true });
  flush();
  refresh();
});
addEventListener('offline', () => store.set({ online: false }));

startRouter();
show(store.state);
loadSession();
refreshOutbox().then(flush);
registerServiceWorker();
