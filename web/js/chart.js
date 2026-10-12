// The review's bar chart, drawn as plain SVG: income and expense per year
// or month, and on request the running total as a line. The table beside
// it carries the same numbers for screen readers.
import { AurilElement, html, raw } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { money, whole } from './format.js';
import { reviewRows } from './data.js';

const HEIGHT = 300;
const PAD = { top: 12, right: 12, bottom: 28 };

// niceStep is a round step that splits span into about four parts.
function niceStep(span) {
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

class ReviewChart extends AurilElement {
  #accumulated = false;
  #width = 0;

  onConnect() {
    this.watch();
    this.delegate('change', '#accumulated', (_, el) => {
      this.#accumulated = el.checked;
      this.update();
    });
    const resize = new ResizeObserver(() => {
      const w = Math.floor(this.querySelector('.chart-box')?.clientWidth ?? 0);
      if (w && w !== this.#width) {
        this.#width = w;
        this.update();
      }
    });
    resize.observe(this);
    this.signal.addEventListener('abort', () => resize.disconnect());
  }

  render() {
    const s = store.state;
    const data = reviewRows(s);
    if (s.route.month || !data || data.error || data.rows.length === 0) return '';
    const rows = data.rows;
    let running = 0;
    const acc = rows.map((r) => (running += r.total));
    const canAccumulate = rows.some((r) => r.income !== 0 && r.expense !== 0);
    const showLine = canAccumulate && this.#accumulated;
    return html`<div class="card chart-card">
      <div class="chart-box">${this.#width > 0 && raw(this.#svg(rows, showLine ? acc : null, s.route.year ? 'month' : 'year'))}</div>
      <ul class="legend">
        <li class="income"><span class="swatch"></span>${t('incomes')}</li>
        <li class="expense"><span class="swatch"></span>${t('expenses')}</li>
        ${showLine && html`<li class="accumulated"><span class="swatch line"></span>${t('accumulatedTotal')}</li>`}
      </ul>
      ${canAccumulate && html`<label class="check accumulated-toggle"><input type="checkbox" id="accumulated" ${this.#accumulated ? 'checked' : ''}>${t('accumulatedTotal')}</label>`}
    </div>`;
  }

  #svg(rows, acc, xKey) {
    const W = this.#width;
    const values = [0, ...rows.flatMap((r) => [r.income, r.expense]), ...(acc ?? [])];
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max === min) max = min + 1;
    const step = niceStep(max - min);
    min = Math.floor(min / step) * step;
    max = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    const labelWidth = Math.max(...ticks.map((v) => whole(v).length)) * 7 + 10;
    const left = labelWidth;
    const plotW = W - left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const y = (v) => PAD.top + ((max - v) / (max - min)) * plotH;
    const band = plotW / rows.length;
    const bar = Math.max(2, Math.min(band * 0.3, 40));
    const cx = (i) => left + band * (i + 0.5);
    const parts = [];
    for (const v of ticks) {
      parts.push(`<line class="grid" x1="${left}" x2="${W - PAD.right}" y1="${y(v)}" y2="${y(v)}"/>`);
      parts.push(`<text class="tick" x="${left - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${esc(whole(v))}</text>`);
    }
    const rect = (x, v, cls, label) => {
      const top = Math.min(y(v), y(0));
      const h = Math.max(Math.abs(y(v) - y(0)), v === 0 ? 0 : 1);
      return `<rect class="${cls}" x="${x}" y="${top}" width="${bar}" height="${h}" rx="3"><title>${esc(label)}</title></rect>`;
    };
    rows.forEach((r, i) => {
      const name = r[xKey];
      parts.push(rect(cx(i) - bar - 1, r.income, 'bar-income', `${name}: ${t('incomes')} ${money(r.income)}`));
      parts.push(rect(cx(i) + 1, r.expense, 'bar-expense', `${name}: ${t('expenses')} ${money(r.expense)}`));
      parts.push(`<text class="tick" x="${cx(i)}" y="${HEIGHT - 8}" text-anchor="middle">${esc(name)}</text>`);
    });
    parts.push(`<line class="axis" x1="${left}" x2="${W - PAD.right}" y1="${y(0)}" y2="${y(0)}"/>`);
    if (acc) {
      const points = acc.map((v, i) => `${cx(i)},${y(v)}`).join(' ');
      parts.push(`<polyline class="line-accumulated" points="${points}"/>`);
      acc.forEach((v, i) => parts.push(`<circle class="dot-accumulated" cx="${cx(i)}" cy="${y(v)}" r="3"><title>${esc(`${rows[i][xKey]}: ${t('accumulatedTotal')} ${money(v)}`)}</title></circle>`));
    }
    return `<svg class="chart" width="${W}" height="${HEIGHT}" viewBox="0 0 ${W} ${HEIGHT}" role="img" aria-label="${esc(t('chart'))}">${parts.join('')}</svg>`;
  }
}
customElements.define('review-chart', ReviewChart);
