// The ledger choice (/ledgers): shown after login to an account with more
// than one ledger, and from the top bar to switch.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { chooseLedger, refresh } from './data.js';
import { screen } from './screens.js';
import { go } from './nav.js';

class LedgerChoice extends AurilElement {
  onConnect() {
    this.watch();
    this.delegate('click', '[data-ledger]', (_, el) => {
      chooseLedger(el.dataset.ledger);
      if (store.state.route.name === 'ledgers') go('/');
      else refresh();
    });
  }

  render() {
    const s = store.state;
    const ledgers = s.session?.ledgers ?? [];
    return html`<main class="page narrow">
      <section class="card">
        ${ledgers.length === 0 && html`<p class="empty">${t('noLedger')}</p>`}
        <ul class="ledger-list">
          ${ledgers.map((l) => html`<li><button type="button" id="ledger-${l.id}" class="ledger-choice" data-ledger="${l.id}" ${l.id === s.ledger ? html`aria-current="true"` : ''}>${icon('book')}<span>${l.name}</span></button></li>`)}
        </ul>
      </section>
    </main>`;
  }
}
customElements.define('ledger-choice', LedgerChoice);
screen('ledgers', 'ledger-choice', { title: () => t('chooseLedger') });
