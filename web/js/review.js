// Review (/review, /review/YYYY, /review/YYYY/M): one page for all years, a
// year or a month. On top the period navigation, the category filter (not
// for a month) and four headline numbers against the year before; then the
// bar chart (for a month, its expenses by category), the heatmap of categories over the
// months or years, and the table, folded.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { money, moneyParts, currencySign, monthName } from './format.js';
import { pad } from './calendar.js';
import { reviewRows, loadCategories, loadReview, loadGrid, gridKey } from './data.js';
import { screen } from './screens.js';
import { go } from './nav.js';
import './chart.js';

class ReviewView extends AurilElement {
  onConnect() {
    this.watch((st) => Boolean(st.route.month), () => this.update());
  }

  render() {
    const month = Boolean(store.state.route.month);
    return html`<main class="page review">
      <review-period></review-period>
      ${!month && html`<category-filter></category-filter>`}
      <review-boxes></review-boxes>
      <div class="review-grid">
        ${month ? html`<expense-bars></expense-bars>` : html`<review-chart></review-chart>`}
        <review-heatmap></review-heatmap>
      </div>
      <review-table></review-table>
    </main>`;
  }
}
customElements.define('review-view', ReviewView);
screen('review', 'review-view', {
  load: () => {
    loadCategories();
    loadReview();
    loadGrid();
  },
  title: ({ route: r }) => (r.month ? `${t('review')} ${monthName(`${r.year}-${pad(r.month)}`)}` : r.year ? `${t('review')} ${r.year}` : t('review')),
});

const cq = (route) => (route.categories?.length ? `?categories=${route.categories.join(',')}` : '');
const nowYm = () => new Date().toISOString().slice(0, 7);

// ReviewPeriod is the navigation: all years, a year or a month, and the
// steps to the period before and after.
class ReviewPeriod extends AurilElement {
  onConnect() {
    this.watch((st) => st.route, () => this.update());
  }

  render() {
    const r = store.state.route;
    const [cy, cm] = nowYm().split('-').map(Number);
    const y = r.year ?? cy;
    const m = r.month ?? (y === cy ? cm : 12);
    const kind = r.month ? 'month' : r.year ? 'year' : 'all';
    const tab = (k, href, label) => html`<a class="seg-item ${kind === k ? 'active' : ''}" id="period-${k}" href="${href}" ${kind === k ? html`aria-current="page"` : ''}>${label}</a>`;
    let prev = null;
    let next = null;
    let title = t('allYears');
    if (kind === 'month') {
      const p = m === 1 ? [y - 1, 12] : [y, m - 1];
      const n = m === 12 ? [y + 1, 1] : [y, m + 1];
      prev = { href: `/review/${p[0]}/${p[1]}`, label: `${p[0]}-${pad(p[1])}` };
      next = { href: `/review/${n[0]}/${n[1]}`, label: `${n[0]}-${pad(n[1])}` };
      title = `${y}-${pad(m)}`;
    } else if (kind === 'year') {
      prev = { href: `/review/${y - 1}${cq(r)}`, label: String(y - 1) };
      next = { href: `/review/${y + 1}${cq(r)}`, label: String(y + 1) };
      title = String(y);
    }
    return html`<div class="period-bar">
      <nav class="seg" aria-label="${t('period')}">
        ${tab('all', `/review${cq(r)}`, t('allYears'))}${tab('year', `/review/${y}${cq(r)}`, t('year'))}${tab('month', `/review/${y}/${m}`, t('month'))}
      </nav>
      <div class="review-nav">
        ${prev && html`<a class="button secondary" id="review-prev" href="${prev.href}" aria-label="${t('previousPeriod', prev.label)}">${icon('chevronLeft')}</a>`}
        ${kind !== 'all' && html`<h2 class="review-title">${title}</h2>`}
        ${next && html`<a class="button secondary" id="review-next" href="${next.href}" aria-label="${t('nextPeriod', next.label)}">${icon('chevronRight')}</a>`}
      </div>
    </div>`;
  }
}
customElements.define('review-period', ReviewPeriod);

// chosenOnly keeps the cells of the filter's categories; without a filter,
// and on a month (which has none), every cell.
function chosenOnly(cells, r) {
  const chosen = r.month ? [] : r.categories ?? [];
  return chosen.length ? (cells ?? []).filter((c) => chosen.includes(c.categoryId)) : cells ?? [];
}

// periodTotals sums the grid cells of the route's period: one month, the
// year, or every year, for the filter's categories. previous is the same
// period a year earlier.
function periodTotals(s) {
  const g = s.grid;
  if (!g || g.key !== gridKey(s) || g.error) return null;
  // The running year counts only its months so far, in both years, so it
  // isn't held against a whole year.
  const r = s.route;
  const [cy, cm] = nowYm().split('-').map(Number);
  const upTo = r.year === cy && !r.month ? cm : 12;
  const add = (cells, month) => {
    const out = { income: 0, expense: 0 };
    for (const c of cells ?? []) {
      if (month && c.period !== month) continue;
      if (r.year && c.period > upTo) continue;
      out.income += c.income;
      out.expense += c.expense;
    }
    out.income = Math.round(out.income * 100) / 100;
    out.expense = Math.round(out.expense * 100) / 100;
    out.saldo = Math.round((out.income - out.expense) * 100) / 100;
    out.rate = out.income > 0 ? Math.round((out.saldo / out.income) * 100) : null;
    return out;
  };
  return { now: add(chosenOnly(g.cells, r), r.month), before: g.previous && add(chosenOnly(g.previous, r), r.month), upTo: upTo < 12 ? upTo : 0 };
}

// ReviewBoxes are the four headline numbers, each against the same period
// a year earlier.
class ReviewBoxes extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const sums = periodTotals(s);
    if (!sums) return html`<div class="boxes"></div>`;
    const { now, before, upTo } = sums;
    const r = s.route;
    const was = r.month ? `${r.year - 1}-${pad(r.month)}` : r.year ? `${r.year - 1}${upTo ? ` ${t('untilMonth', monthShort(r.year - 1, upTo))}` : ''}` : '';
    const change = (a, b) => {
      if (!before || !b) return '';
      const d = Math.round(((a - b) / Math.abs(b)) * 100);
      return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} % ${t('versus', was)}`;
    };
    const box = (id, label, value, note, cls = '') => html`<div class="box" id="box-${id}"><span class="box-label">${label}</span><span class="box-value ${cls}">${value}</span><span class="box-note">${note || ''}</span></div>`;
    return html`<div class="boxes">
      ${box('income', t('incomes'), money(now.income), change(now.income, before?.income))}
      ${box('expense', t('expenses'), money(now.expense), change(now.expense, before?.expense))}
      ${box('saved', t('saved'), money(now.saldo), before && `${t('before', was)} ${money(before.saldo)}`, now.saldo < 0 ? 'expense' : 'income')}
      ${box('rate', t('savingsRate'), now.rate === null ? '–' : `${now.rate} %`, before && before.rate !== null && `${t('before', was)} ${before.rate} %`)}
    </div>`;
  }
}
customElements.define('review-boxes', ReviewBoxes);

// searchTerm is the #term that finds a category in the month list.
const searchTerm = (name) => `#${name.split(/[^\p{L}\p{N}_]/u)[0]}`;

// ExpenseBars shows a month's expenses per category, largest first; a row
// opens the month's transactions of that category.
class ExpenseBars extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const data = reviewRows(s);
    if (!data || data.error) return html`<div class="card bars-card"><p class="empty">${data ? t('loadFailed') : t('loading')}</p></div>`;
    const rows = data.rows.filter((x) => x.expense > 0).sort((a, b) => b.expense - a.expense);
    const max = Math.max(...rows.map((x) => x.expense), 1);
    const ym = `${s.route.year}-${pad(s.route.month)}`;
    return html`<div class="card bars-card">
      <h3 class="card-subtitle">${t('expensesByCategory')}</h3>
      ${rows.length === 0 && html`<p class="empty">${t('noData')}</p>`}
      <ul class="xbars">${rows.map((x) => html`<li><a class="xbar" id="xbar-${x.categoryId}" href="/${ym}?q=${encodeURIComponent(searchTerm(x.category))}">
        <span class="xname">${x.category}</span>
        <svg class="xtrack" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect width="${Math.max((x.expense / max) * 100, 0.5)}" height="10" rx="1"></rect></svg>
        <span class="xamount">${money(x.expense)}</span>
      </a></li>`)}</ul>
    </div>`;
  }
}
customElements.define('expense-bars', ExpenseBars);

// ReviewHeatmap lays out expenses per category (rows) and month or year
// (columns), only the filter's categories when one is chosen. Each row has its own scale, so a small category shows its own
// ups and downs; a cell over 1.5 times the row's median month is framed.
class ReviewHeatmap extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const g = s.grid;
    if (!g || g.key !== gridKey(s)) return html`<div class="card heat-card"><p class="empty">${t('loading')}</p></div>`;
    if (g.error) return html`<div class="card heat-card"><p class="empty">${s.online ? t('loadFailed') : t('offlineList')}</p></div>`;
    const r = s.route;
    const cols = r.year
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [...new Set(g.cells.map((c) => c.period))].sort((a, b) => a - b);
    const cats = new Map();
    for (const c of chosenOnly(g.cells, r)) {
      if (c.expense <= 0) continue;
      const row = cats.get(c.categoryId) ?? { id: c.categoryId, name: c.category, total: 0, by: new Map() };
      row.by.set(c.period, c.expense);
      row.total += c.expense;
      cats.set(c.categoryId, row);
    }
    const rows = [...cats.values()].sort((a, b) => b.total - a.total);
    const colLabel = (p) => (r.year ? monthLetter(r.year, p) : String(p).slice(2));
    const cell = (row, p) => {
      const v = row.by.get(p) ?? 0;
      const seen = [...row.by.values()].sort((a, b) => a - b);
      const median = seen[Math.floor(seen.length / 2)] ?? 0;
      const max = Math.max(...seen);
      const level = v > 0 ? Math.min(5, Math.max(1, Math.ceil((v / max) * 5))) : 0;
      const odd = v > 1.5 * median && v - median > 50 && seen.length > 2;
      const when = r.year ? `${r.year}-${pad(p)}` : String(p);
      const href = r.year ? `/${r.year}-${pad(p)}?q=${encodeURIComponent(searchTerm(row.name))}` : `/review/${p}`;
      const label = `${row.name}, ${r.year ? monthName(when) : when}: ${money(v)}${odd ? `, ${t('unusual')}` : ''}`;
      const open = r.month === p;
      return html`<a class="heat l${level} ${odd ? 'odd' : ''} ${open ? 'open' : ''}" href="${href}" title="${label}" aria-label="${label}"></a>`;
    };
    return html`<div class="card heat-card">
      <h3 class="card-subtitle">${r.year ? t('heatYear', r.year) : t('heatAll')}</h3>
      ${rows.length === 0 && html`<p class="empty">${t('noData')}</p>`}
      ${rows.length > 0 && html`<div class="heatmap" role="grid" aria-label="${r.year ? t('heatYear', r.year) : t('heatAll')}">
        <div class="heat-row heat-head" role="row"><span class="heat-name"></span>${cols.map((p) => html`<span class="heat-col ${r.month === p ? 'open' : ''}" role="columnheader">${colLabel(p)}</span>`)}</div>
        ${rows.map((row) => html`<div class="heat-row" role="row" id="heat-${row.id}"><span class="heat-name" role="rowheader">${row.name}</span>${cols.map((p) => cell(row, p))}</div>`)}
      </div>
      <p class="note">${t('heatNote')}</p>`}
    </div>`;
  }
}
customElements.define('review-heatmap', ReviewHeatmap);

const monthShort = (year, month) => new Intl.DateTimeFormat(store.state.lang === 'en' ? 'en-US' : 'de-DE', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
const monthLetter = (year, month) => new Intl.DateTimeFormat(store.state.lang === 'en' ? 'en-US' : 'de-DE', { month: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));

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
  #open = false; // the reader unfolded the table; a re-render keeps it so

  onConnect() {
    this.watch();
    // toggle doesn't bubble, so listen in the capture phase.
    this.addEventListener('toggle', (e) => { this.#open = e.target.open; }, { capture: true, signal: this.signal });
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
    const amount = (n) => moneyParts(n).map((p) => (p.currency ? html`<span class="cur">${p.text}</span>` : p.text));
    const cells = (x) => html`<td class="num">${amount(x.income)}</td><td class="num">${amount(x.expense)}</td><td class="num ${x.total < 0 ? 'expense' : 'income'}">${amount(x.total)}</td>`;
    let head, body;
    if (r.month) {
      head = t('category');
      body = rows.map((x) => html`<tr id="review-cat-${x.categoryId}"><td>${x.category}</td>${cells(x)}</tr>`);
    } else if (r.year) {
      head = t('month');
      body = rows.map((x) => html`<tr id="review-month-${x.month}">
        <td><a class="button outline small" href="/review/${r.year}/${x.month}${cq(r)}" aria-label="${t('viewReview', `${r.year}-${pad(x.month)}`)}"><span class="cell-icon">${icon('chart')}</span>${x.month}</a></td>
        ${cells(x)}
        <td><a class="button outline small icon-only" href="/${r.year}-${pad(x.month)}" aria-label="${t('viewTransactions', `${r.year}-${pad(x.month)}`)}">${icon('list')}</a></td>
      </tr>`);
    } else {
      head = t('year');
      body = rows.map((x) => html`<tr id="review-year-${x.year}"><td><a class="button outline small" href="/review/${x.year}${cq(r)}"><span class="cell-icon">${icon('chart')}</span>${x.year}</a></td>${cells(x)}</tr>`);
    }
    const extra = r.year && !r.month;
    const unit = html`<span class="cur-head"> (${currencySign()})</span>`;
    return html`<details class="card table-card" ${this.#open ? 'open' : ''}><summary>${t('table')}</summary><div class="table-wrap" tabindex="0"><table class="review-table ${r.year && !r.month ? 'striped' : ''}">
      <thead><tr><th class="first">${head}</th><th class="num">${t('incomes')}${unit}</th><th class="num">${t('expenses')}${unit}</th><th class="num">${t('total')}${unit}</th>${extra && html`<th><span class="visually-hidden">${t('viewTransactions', '')}</span></th>`}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th class="first" scope="row">${t('total')}</th>${cells(totals)}${extra && html`<td></td>`}</tr></tfoot>
    </table>${rows.length === 0 && html`<p class="empty">${t('noData')}</p>`}</div></details>`;
  }
}
customElements.define('review-table', ReviewTable);
