// The month view (/, /YYYY-MM, /YYYY-MM/{id}): the transaction form beside
// the month's list with its search, and the bar to the months around it.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { money, date } from './format.js';
import { shiftYm } from './calendar.js';
import { transactionsKey, loadCategories, loadTemplates, loadTransactions, loadTransaction } from './data.js';
import { screen } from './screens.js';
import { go, withQuery } from './nav.js';
import { discard } from './outbox.js';
import { Arm } from './arm.js';
import './txform.js';

class MonthView extends AurilElement {
  render() {
    return html`<main class="page split">
      <aside class="form-col"><div class="card form-card"><transaction-form></transaction-form></div></aside>
      <section class="list-col"><month-list></month-list><month-bar></month-bar></section>
    </main>`;
  }
}
customElements.define('month-view', MonthView);
screen('month', 'month-view', () => {
  loadCategories();
  loadTemplates();
  loadTransactions();
  if (store.state.route.id) loadTransaction();
});

// shownEntries is what the list shows: the server's transactions plus the
// entries of this month still in the outbox, waiting or refused, newest day
// first. A refused entry doesn't count in the month total.
// While another month or search loads, the last list stays, marked stale,
// so the bar below doesn't jump up under the cursor.
function shownEntries(s) {
  const list = s.transactions;
  if (!list) return null;
  const stale = list.key !== transactionsKey(s);
  const outbox = (entries, mark) => (s.route.q ? [] : entries
    .filter((e) => e.ledger === s.ledger && e.body.date.startsWith(s.route.ym))
    .map((e) => ({ ...e.body, key: e.key, [mark]: e.refused ?? true, category: s.categories?.find((c) => c.id === e.body.categoryId)?.name ?? '' }))
    .reverse());
  const waiting = [...outbox(s.refused, 'refused'), ...outbox(s.waiting, 'waiting')];
  const items = [...waiting, ...list.items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { items, error: list.error, stale };
}

class MonthList extends AurilElement {
  #q = ''; // the search as typed, until submitted
  #forQ = null;
  #arm = new Arm(() => this.update());

  onConnect() {
    this.watch();
    this.#arm.wire(this);
    this.delegate('click', '[data-retry]', (_, el) => {
      const { ym, q } = store.state.route;
      go(withQuery(`/${ym}`, 'q', q));
      store.set({ retry: el.dataset.retry });
    });
    this.delegate('click', '[data-arm^="discard-"]', (_, el) => { if (this.#arm.tap(el.id)) discard(el.id.slice('discard-'.length)); });
    this.delegate('input', '#q', (_, el) => { this.#q = el.value; });
    this.delegate('submit', '#search', (e) => {
      e.preventDefault();
      this.#search(this.#q.trim());
    });
    this.delegate('click', '#search-clear', () => {
      this.#q = '';
      this.#search('');
    });
  }

  #search(q) {
    go(withQuery(location.pathname, 'q', q), { replace: true });
    this.update();
  }

  render() {
    const s = store.state;
    const { ym, id, q } = s.route;
    if (this.#forQ !== q) {
      this.#q = q;
      this.#forQ = q;
    }
    const shown = shownEntries(s);
    const days = [];
    for (const e of shown?.items ?? []) {
      if (days.at(-1)?.date !== e.date) days.push({ date: e.date, items: [] });
      days.at(-1).items.push(e);
    }
    const count = shown?.items.length ?? 0;
    const row = (e) => {
      const what = html`<span class="what"><span class="cat">${e.category}</span>${e.note && html`<span class="note"> - ${e.note}</span>`}</span>`;
      if (e.refused) {
        return html`<div class="row ${e.type} refused" id="r-${e.key}">
          ${what}<span class="badge">${icon('alert')}${t('refused')}</span><span class="amount">${money(e.amount)}</span>
          <p class="refused-reason">${e.refused.message}</p>
          <span class="refused-actions">
            <button type="button" class="button secondary small" data-retry="${e.key}">${t('fixEntry')}</button>
            ${this.#arm.button(`discard-${e.key}`, t('discardEntry'), 'small')}
          </span>
        </div>`;
      }
      if (e.waiting) {
        return html`<div class="row ${e.type} waiting" id="w-${e.key}">${what}<span class="badge">${icon('clock')}${t('waiting')}</span><span class="amount">${money(e.amount)}</span></div>`;
      }
      const selected = String(e.id) === id;
      return html`<a class="row ${e.type} ${selected ? 'selected' : ''}" id="tx-${e.id}" href="${withQuery(`/${ym}/${e.id}`, 'q', q)}" ${selected ? html`aria-current="true"` : ''}>${what}<span class="amount">${money(e.amount)}</span></a>`;
    };
    return html`<div class="card list-card ${shown?.stale ? 'stale' : ''}" aria-busy="${shown?.stale ? 'true' : 'false'}">
      <div class="search-box">
        <form id="search" class="search" role="search">
          <span class="search-icon">${icon('search')}</span>
          <input id="q" name="q" value="${this.#q}" placeholder="${t('searchPlaceholder')}" aria-label="${t('searchLabel')}" autocomplete="off" enterkeyhint="search">
          <button type="button" id="search-clear" class="button ghost icon-only" aria-label="${t('clearSearch')}">${icon('x')}</button>
          <button type="submit" class="button ghost icon-only" aria-label="${t('search')}">${icon('arrowRight')}</button>
        </form>
        ${q && shown && !shown.stale && html`<p class="result-count" role="status">${count} ${count === 1 ? t('transaction') : t('transactions')}</p>`}
      </div>
      <h1 class="month-title">${ym}</h1>
      ${!shown && html`<p class="empty">${t('loading')}</p>`}
      ${shown?.error && html`<p class="empty">${s.online ? t('loadFailed') : t('offlineList')}</p>`}
      ${shown && !shown.error && count === 0 && html`<p class="empty">${t('noEntries')}</p>`}
      ${days.map((d) => html`<h2 class="day" id="day-${d.date}">${date(d.date)}</h2>${d.items.map(row)}`)}
    </div>`;
  }
}
customElements.define('month-list', MonthList);

class MonthBar extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const { ym } = s.route;
    const prev = shiftYm(ym, -1);
    const next = shiftYm(ym, 1);
    const items = shownEntries(s)?.items ?? [];
    const total = Math.round(items.filter((e) => !e.refused).reduce((sum, e) => sum + (e.type === 'expense' ? -e.amount : e.amount), 0) * 100) / 100;
    return html`<div class="month-bar">
      <a class="button secondary" id="prev-month" href="/${prev}" aria-label="${t('previousMonth', prev)}">${icon('chevronLeft')}${prev}</a>
      <span class="month-total ${total < 0 ? 'expense' : 'income'}">${total !== 0 ? money(total) : ''}</span>
      <a class="button secondary" id="next-month" href="/${next}" aria-label="${t('nextMonth', next)}">${next}${icon('chevronRight')}</a>
    </div>`;
  }
}
customElements.define('month-bar', MonthBar);
