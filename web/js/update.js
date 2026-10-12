// The service worker and the update notice. A new version never reloads by
// itself: a banner under the top bar offers "update now" or "later".
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';

let waitingWorker = null;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    const offer = (worker) => {
      waitingWorker = worker;
      store.set({ updateReady: true });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!waitingWorker || reloading) return; // only after "update now"
    reloading = true;
    location.reload();
  });
}

class UpdateBanner extends AurilElement {
  #later = false;

  onConnect() {
    this.watch((s) => s.updateReady, () => this.update());
    this.delegate('click', '#update-now', () => waitingWorker?.postMessage('skip-waiting'));
    this.delegate('click', '#update-later', () => {
      this.#later = true;
      this.update();
    });
  }

  render() {
    if (!store.state.updateReady || this.#later) return '';
    return html`<div class="update-banner" role="status">
      <span>${t('updateText')}</span>
      <button type="button" id="update-now" class="button primary">${t('updateNow')}</button>
      <button type="button" id="update-later" class="button outline">${t('later')}</button>
    </div>`;
  }
}
customElements.define('update-banner', UpdateBanner);
