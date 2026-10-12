// The brown top bar: home link with the version, the ledger switch when the
// account has several, the offline state with the number of waiting
// entries, and the links to categories, templates, review and logout.
import { AurilElement, html } from '../auril/index.js';
import { store, ledgerName } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { logout } from './session.js';

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
    const link = (href, name, label) => html`<a class="bar-link" href="${href}">${icon(name)}<span class="bar-label">${label}</span></a>`;
    return html`<nav class="topbar" aria-label="Budget">
      <div class="bar-start">
        <a class="brand" href="/" aria-label="${t('home')}">${icon('wallet')}<span class="brand-word">Budget</span></a>
        <span class="version">v${s.session.version}</span>
        ${ledgers.length > 1 && s.ledger && html`<a class="bar-link ledger-switch" href="/ledgers" aria-label="${t('switchLedger', ledgerName(s))}">${icon('book')}<span class="ledger-name">${ledgerName(s)}</span></a>`}
      </div>
      <div class="bar-status" role="status">
        ${!s.online && html`<span class="offline">${icon('cloudOff')}${t('offline')}</span>`}
        ${waiting > 0 && html`<span class="waiting-count">${icon('clock')}${t('waitingCount', waiting)}</span>`}
      </div>
      <div class="bar-end">
        ${link('/categories', 'tag', t('categories'))}
        ${link('/templates', 'template', t('templates'))}
        ${link('/review', 'calculator', t('review'))}
        <button type="button" id="logout" class="bar-link">${icon('logout')}<span class="bar-label">${t('logout')}</span></button>
      </div>
    </nav>`;
  }
}
customElements.define('top-bar', TopBar);
