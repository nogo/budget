// The transaction form beside the month list. A new entry goes through the
// outbox with a fresh key; an open one (/YYYY-MM/{id}) can be saved,
// deleted with two taps, or saved as a template. The amount field takes
// arithmetic: "12+4,50" saves 16.50.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { money } from './format.js';
import { amountOf, evaluate, notAmount } from './calc.js';
import { dateIn, dayOf } from './calendar.js';
import * as api from './api.js';
import { submit, discard } from './outbox.js';
import { loadTemplates, loadTransactions } from './data.js';
import { go, withQuery } from './nav.js';
import { Arm } from './arm.js';

// newKey is a random entry key; randomUUID needs a secure context, a LAN
// address over http isn't one.
function newKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// templateLabel is a template button's text: its note, or "(day.) amount",
// or "(day.)".
export function templateLabel(tp) {
  if (tp.note) return tp.note;
  if (tp.amount > 0) return `(${tp.day}.) ${money(tp.amount)}`;
  return `(${tp.day}.)`;
}

class TransactionForm extends AurilElement {
  #draft = null; // { amount, categoryId, note, date, type } as shown
  #for = ''; // what the draft belongs to: "new YYYY-MM" or "edit ID"
  #errors = {}; // field -> message; "" is the whole form
  #saving = false;
  #templateSaved = false;
  #replaces = null; // key of the refused entry this draft fixes; it goes once the fix is saved or waits
  #arm = new Arm(() => this.update());

  onConnect() {
    this.watch(() => this.update());
    this.#arm.wire(this);
    this.delegate('input', '#amount', (_, el) => {
      const clean = el.value.replace(notAmount, '');
      if (clean !== el.value) el.value = clean;
      this.#draft.amount = clean;
      if (this.#errors.amount && amountOf(clean) > 0) delete this.#errors.amount;
      this.update();
    });
    this.delegate('focusin', '#amount', (_, el) => el.select());
    this.delegate('mouseup', '#amount', (e, el) => { if (el.selectionStart === 0 && el.selectionEnd === el.value.length) e.preventDefault(); });
    this.delegate('change', '#category', (_, el) => { this.#draft.categoryId = Number(el.value); this.update(); });
    this.delegate('input', '#note', (_, el) => { this.#draft.note = el.value; });
    this.delegate('input', '#date', (_, el) => { this.#draft.date = el.value; });
    this.delegate('change', '[name="tx-type"]', (_, el) => { this.#draft.type = el.value; this.update(); });
    this.delegate('click', '[data-template]', (_, el) => this.#fill(Number(el.dataset.template)));
    this.delegate('submit', 'form', (e) => {
      e.preventDefault();
      this.#save();
    });
    this.delegate('click', '#tx-delete', () => { if (this.#arm.tap('tx-delete')) this.#delete(); });
    this.delegate('click', '#tx-template', () => this.#saveAsTemplate());
  }

  // sync makes the draft follow the route: a fresh one for a new entry,
  // the stored transaction for an open one.
  #sync() {
    const s = store.state;
    const { ym, id } = s.route;
    const cats = s.categories ?? [];
    if (id) {
      const tx = s.transaction?.id === Number(id) && !s.transaction.error ? s.transaction : null;
      if (this.#for !== `edit ${id}` && tx) {
        this.#for = `edit ${id}`;
        this.#draft = { amount: String(tx.amount), categoryId: tx.categoryId, note: tx.note, date: tx.date, type: tx.type };
        this.#errors = {};
        this.#arm.reset();
      }
      if (this.#for !== `edit ${id}`) return false;
    } else if (this.#for !== `new ${ym}`) {
      if (this.#draft && this.#for.startsWith('new ')) this.#draft.date = dateIn(ym);
      else this.#draft = { amount: '0', categoryId: cats[0]?.id, note: '', date: dateIn(ym), type: 'expense' };
      this.#for = `new ${ym}`;
      this.#errors = {};
    }
    const retry = !id && s.retry && s.refused.find((e) => e.key === s.retry);
    if (retry) {
      const b = retry.body;
      this.#draft = { amount: String(b.amount), categoryId: b.categoryId, note: b.note, date: b.date, type: b.type };
      this.#replaces = retry.key;
      this.#errors = retry.refused.field ? { [retry.refused.field]: retry.refused.message } : { '': retry.refused.message };
      queueMicrotask(() => store.set({ retry: null }));
    }
    if (!cats.some((c) => c.id === this.#draft.categoryId) && cats.length > 0 && !id) this.#draft.categoryId = cats[0].id;
    return true;
  }

  #fill(templateId) {
    const tp = store.state.templates?.find((x) => x.id === templateId);
    if (!tp) return;
    const d = this.#draft;
    if (tp.amount > 0) d.amount = String(tp.amount);
    if (tp.note !== '') d.note = tp.note;
    d.type = tp.type;
    d.date = dateIn(store.state.route.ym, tp.day);
    delete this.#errors.amount;
    this.update();
  }

  #body() {
    const d = this.#draft;
    return { amount: amountOf(d.amount), type: d.type, categoryId: d.categoryId, date: d.date, note: d.note.trim() };
  }

  #backToMonth() {
    const { ym, q } = store.state.route;
    go(withQuery(`/${ym}`, 'q', q));
  }

  #fail(err) {
    if (err instanceof api.OfflineError) this.#errors = { '': t('needsConnection') };
    else this.#errors = { [err.field || '']: err.message };
  }

  async #save() {
    if (this.#saving) return;
    const body = this.#body();
    if (!(body.amount > 0)) {
      this.#errors = { amount: t('amountGreaterThanZero') };
      this.update();
      this.querySelector('#amount')?.focus();
      return;
    }
    this.#saving = true;
    this.#errors = {};
    this.update();
    const { ledger, route } = store.state;
    try {
      if (route.id) {
        await api.updateTransaction(ledger, route.id, body);
        loadTransactions();
        this.#backToMonth();
      } else {
        const outcome = await submit(ledger, { key: newKey(), ...body });
        if (outcome.error) {
          this.#fail(outcome.error);
        } else {
          if (this.#replaces) discard(this.#replaces);
          this.#replaces = null;
          const cats = store.state.categories ?? [];
          this.#draft = { amount: '0', categoryId: cats[0]?.id, note: '', date: dateIn(route.ym), type: 'expense' };
          if (outcome.transaction) loadTransactions();
        }
      }
    } catch (err) {
      this.#fail(err);
    }
    this.#saving = false;
    this.update();
  }

  async #delete() {
    const { ledger, route } = store.state;
    try {
      await api.deleteTransaction(ledger, route.id);
      loadTransactions();
      this.#backToMonth();
    } catch (err) {
      this.#fail(err);
      this.update();
    }
  }

  async #saveAsTemplate() {
    const tx = store.state.transaction;
    try {
      await api.createTemplate(store.state.ledger, { categoryId: tx.categoryId, note: tx.note, amount: tx.amount, type: tx.type, day: dayOf(tx.date) });
      loadTemplates();
      this.#templateSaved = true;
      setTimeout(() => {
        this.#templateSaved = false;
        if (this.isConnected) this.update();
      }, 3000);
    } catch (err) {
      this.#fail(err);
    }
    this.update();
  }

  render() {
    const s = store.state;
    if (!this.#sync()) {
      const missing = s.transaction?.id === Number(s.route.id) && s.transaction.error;
      return html`<p class="empty">${missing ? t('notFound') : t('loading')}</p>`;
    }
    const d = this.#draft;
    const editing = Boolean(s.route.id);
    const cats = s.categories ?? [];
    const category = cats.find((c) => c.id === d.categoryId);
    const templates = editing ? [] : (s.templates ?? []).filter((tp) => tp.categoryId === d.categoryId);
    const value = evaluate(d.amount);
    const shown = Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0;
    const err = this.#errors;
    const radio = (type) => html`<label class="radio ${type}"><input type="radio" name="tx-type" id="tx-${type}" value="${type}" ${d.type === type ? 'checked' : ''}><span>${t(type)}</span></label>`;
    return html`<form id="tx-form" class="form" novalidate>
      <div class="field">
        <label for="amount">${t('amount')}</label>
        <div class="amount-wrap">
          <input id="amount" name="amount" type="text" inputmode="text" autocomplete="off" value="${d.amount}" ${err.amount ? html`aria-invalid="true" aria-describedby="amount-error"` : ''}>
          <output class="calc" for="amount">${d.amount !== String(shown) ? `= ${shown}` : ''}</output>
        </div>
        ${err.amount && html`<p class="error" id="amount-error">${err.amount}</p>`}
      </div>
      <div class="field">
        <label for="category">${t('category')}</label>
        <select id="category" name="category">${cats.map((c) => html`<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${c.name}</option>`)}</select>
        ${err.categoryId && html`<p class="error">${err.categoryId}</p>`}
      </div>
      ${category?.hasNotes && html`<div class="field">
        <label for="note">${t('note')}</label>
        <input id="note" name="note" value="${d.note}" autocomplete="off">
        ${err.note && html`<p class="error">${err.note}</p>`}
      </div>`}
      ${templates.length > 0 && html`<div class="template-chips">${templates.map((tp) => html`<button type="button" class="button outline small ${tp.type}" id="use-template-${tp.id}" data-template="${tp.id}">${templateLabel(tp)}</button>`)}</div>`}
      <div class="field">
        <label for="date">${t('date')}</label>
        <input id="date" name="date" type="date" value="${d.date}" required>
        ${err.date && html`<p class="error">${err.date}</p>`}
      </div>
      <fieldset class="types"><legend class="visually-hidden">${t('type')}</legend>${radio('expense')}${radio('income')}</fieldset>
      ${(err[''] || err.type || err.key) && html`<p class="error" role="alert">${err[''] || err.type || err.key}</p>`}
      ${editing
        ? html`<div class="actions">
            ${this.#arm.button('tx-delete', t('delete'))}
            <button type="button" id="tx-template" class="button secondary" aria-label="${t('saveAsTemplate')}">${this.#templateSaved ? icon('check') : icon('save')}</button>
            <button type="submit" id="tx-save" class="button primary" aria-label="${t('save')}">${this.#saving ? icon('spinner', 'spin') : icon('check')}</button>
          </div>
          <p class="saved-note" role="status">${this.#templateSaved ? t('templateSaved') : ''}</p>`
        : html`<div class="actions single"><button type="submit" id="tx-save" class="button primary wide" aria-label="${t('save')}">${this.#saving ? icon('spinner', 'spin') : icon('check')}</button></div>`}
    </form>`;
  }
}
customElements.define('transaction-form', TransactionForm);
