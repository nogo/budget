// The brown top bar: home link, the page title (the page's one h1), the
// ledger switch when the account has several, the offline state with the number of waiting
// entries, a link to the month of this ledger's refused entries, and the
// links to categories, templates, review and logout.
import { AurilElement, html } from '../auril/index.js';
import { store, ledgerName } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { logout } from './session.js';
import { screenTitle } from './screens.js';

class TopBar extends AurilElement {
  onConnect() {
    this.watch();
    this.delegate('click', '#logout', () => logout());
  }

  render() {
    const s = store.state;
    if (!s.session) return '';
    const ledgers = s.session.ledgers ?? [];
    const waiting = s.waiting.length;
    const refused = s.refused.filter((e) => e.ledger === s.ledger);
    const link = (href, name, label) => html`<a class="bar-link" href="${href}">${icon(name)}<span class="bar-label">${label}</span></a>`;
    return html`<header class="topbar">
      <div class="bar-start">
        <a class="brand" href="/" aria-label="${t('home')}">${icon('wallet')}<span class="brand-word">Budget</span></a>
        <h1 class="page-title">${screenTitle(s.ledger ? s.route.name : 'ledgers', s)}</h1>
        ${ledgers.length > 1 && s.ledger && html`<a class="bar-link ledger-switch" href="/ledgers" aria-label="${t('switchLedger', ledgerName(s))}">${icon('book')}<span class="ledger-name">${ledgerName(s)}</span></a>`}
      </div>
      <div class="bar-status" role="status">
        ${!s.online && html`<span class="offline">${icon('cloudOff')}${t('offline')}</span>`}
        ${waiting > 0 && html`<span class="waiting-count">${icon('clock')}${t('waitingCount', waiting)}</span>`}
        ${refused.length > 0 && html`<a class="refused-count" href="/${refused[0].body.date.slice(0, 7)}">${icon('alert')}${t('refusedCount', refused.length)}</a>`}
      </div>
      <nav class="bar-end" aria-label="Budget">
        ${link('/categories', 'tag', t('categories'))}
        ${link('/templates', 'template', t('templates'))}
        ${link('/review', 'calculator', t('review'))}
        <button type="button" id="logout" class="bar-link">${icon('logout')}<span class="bar-label">${t('logout')}</span></button>
      </nav>
    </header>`;
  }
}
customElements.define('top-bar', TopBar);
