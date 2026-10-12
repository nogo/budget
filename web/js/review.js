// Review (/review, /review/YYYY, /review/YYYY/M): income, expense and total
// per year, per month of a year, or per category of a month. Years and
// months get a category filter that stays in the address, and a bar chart.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { money } from './format.js';
import { pad } from './calendar.js';
import { reviewRows, loadCategories, loadReview } from './data.js';
import { screen } from './screens.js';
import { go } from './nav.js';
import './chart.js';

class ReviewView extends AurilElement {
  render() {
    return html`<main class="page review">
      <review-head></review-head>
      <category-filter></category-filter>
      <div class="review-grid"><review-chart></review-chart><review-table></review-table></div>
    </main>`;
  }
}
customElements.define('review-view', ReviewView);
screen('review', 'review-view', () => {
  loadCategories();
  loadReview();
});

const cq = (route) => (route.categories?.length ? `?categories=${route.categories.join(',')}` : '');

class ReviewHead extends AurilElement {
  onConnect() {
    this.watch((s) => s.route, () => this.update());
  }

  render() {
    const r = store.state.route;
    if (!r.year) return html`<h1 class="review-title">${t('reviewTitle')}</h1>`;
    let prev, next, title;
    if (r.month) {
      const p = r.month === 1 ? [r.year - 1, 12] : [r.year, r.month - 1];
      const n = r.month === 12 ? [r.year + 1, 1] : [r.year, r.month + 1];
      prev = { href: `/review/${p[0]}/${p[1]}`, label: `${p[0]}-${pad(p[1])}` };
      next = { href: `/review/${n[0]}/${n[1]}`, label: `${n[0]}-${pad(n[1])}` };
      title = `${r.year}-${pad(r.month)}`;
    } else {
      prev = { href: `/review/${r.year - 1}${cq(r)}`, label: String(r.year - 1) };
      next = { href: `/review/${r.year + 1}${cq(r)}`, label: String(r.year + 1) };
      title = String(r.year);
    }
    return html`<div class="review-nav">
      <a class="button secondary" id="review-prev" href="${prev.href}">${icon('arrowLeftDash')}${prev.label}</a>
      <h1 class="review-title">${title}</h1>
      <a class="button secondary" id="review-next" href="${next.href}">${next.label}${icon('arrowRightDash')}</a>
    </div>`;
  }
}
customElements.define('review-head', ReviewHead);

class CategoryFilter extends AurilElement {
  onConnect() {
    this.watch();
    this.delegate('change', '#filter-add', (_, el) => {
      const id = Number(el.value);
      if (id) this.#set([...store.state.route.categories, id]);
    });
    this.delegate('click', '[data-remove]', (_, el) => this.#set(store.state.route.categories.filter((c) => c !== Number(el.dataset.remove))));
    this.delegate('click', '#filter-clear', () => this.#set([]));
  }

  #set(ids) {
    const r = store.state.route;
    go(`${r.year ? `/review/${r.year}` : '/review'}${cq({ categories: ids })}`);
  }

  render() {
    const s = store.state;
    if (s.route.month) return '';
    const chosen = s.route.categories ?? [];
    const cats = s.categories ?? [];
    const picked = cats.filter((c) => chosen.includes(c.id));
    return html`<div class="filter">
      <div class="filter-row">
        <select id="filter-add" aria-label="${t('filter')}">
          <option value="" selected>${t('selectCategoryPlaceholder')}</option>
          ${cats.filter((c) => !chosen.includes(c.id)).map((c) => html`<option value="${c.id}">${c.name}</option>`)}
        </select>
        ${chosen.length > 0 && html`<button type="button" id="filter-clear" class="button outline">${t('clearAll')}</button>`}
      </div>
      ${picked.length > 0 && html`<ul class="chips">${picked.map((c) => html`<li class="chip" id="chip-${c.id}">${c.name}<button type="button" class="chip-remove" data-remove="${c.id}" aria-label="${t('removeFilter', c.name)}">${icon('x')}</button></li>`)}</ul>`}
    </div>`;
  }
}
customElements.define('category-filter', CategoryFilter);

class ReviewTable extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const r = s.route;
    const data = reviewRows(s);
    if (!data) return html`<p class="empty">${t('loading')}</p>`;
    if (data.error) return html`<p class="empty">${s.online ? t('loadFailed') : t('offlineList')}</p>`;
    // Rows keep the server's order, as the old app did: years and months oldest first, categories by id.
    const rows = data.rows;
    const sum = (k) => Math.round(rows.reduce((acc, x) => acc + x[k], 0) * 100) / 100;
    const totals = { income: sum('income'), expense: sum('expense'), total: sum('total') };
    const cells = (x) => html`<td class="num">${money(x.income)}</td><td class="num">${money(x.expense)}</td><td class="num ${x.total < 0 ? 'expense' : 'income'}">${money(x.total)}</td>`;
    let head, body;
    if (r.month) {
      head = t('category');
      body = rows.map((x) => html`<tr id="review-cat-${x.categoryId}"><td>${x.category}</td>${cells(x)}</tr>`);
    } else if (r.year) {
      head = t('month');
      body = rows.map((x) => html`<tr id="review-month-${x.month}">
        <td><a class="button outline small" href="/review/${r.year}/${x.month}${cq(r)}" aria-label="${t('viewReview', `${r.year}-${pad(x.month)}`)}">${icon('chart')}${x.month}</a></td>
        ${cells(x)}
        <td><a class="button outline small icon-only" href="/${r.year}-${pad(x.month)}" aria-label="${t('viewTransactions', `${r.year}-${pad(x.month)}`)}">${icon('list')}</a></td>
      </tr>`);
    } else {
      head = t('year');
      body = rows.map((x) => html`<tr id="review-year-${x.year}"><td><a class="button outline small" href="/review/${x.year}${cq(r)}">${icon('chart')}${x.year}</a></td>${cells(x)}</tr>`);
    }
    const extra = r.year && !r.month;
    return html`<div class="table-wrap" tabindex="0"><table class="review-table ${r.year && !r.month ? 'striped' : ''}">
      <thead><tr><th class="first">${head}</th><th class="num">${t('incomes')}</th><th class="num">${t('expenses')}</th><th class="num">${t('total')}</th>${extra && html`<th><span class="visually-hidden">${t('viewTransactions', '')}</span></th>`}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th class="first" scope="row">${t('total')}</th>${cells(totals)}${extra && html`<td></td>`}</tr></tfoot>
    </table>${rows.length === 0 && html`<p class="empty">${t('noData')}</p>`}</div>`;
  }
}
customElements.define('review-table', ReviewTable);
