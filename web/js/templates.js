// Templates (/templates, /templates/{id}): the form to add or edit one
// beside the list of all, grouped by category and sorted by day.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { money } from './format.js';
import { amountOf, notAmount } from './calc.js';
import * as api from './api.js';
import { loadCategories, loadTemplates } from './data.js';
import { screen } from './screens.js';
import { go } from './nav.js';
import { Arm } from './arm.js';

class TemplatesView extends AurilElement {
  render() {
    return html`<main class="page split">
      <aside class="form-col"><div class="card form-card"><template-form></template-form></div></aside>
      <section class="list-col"><template-list></template-list></section>
    </main>`;
  }
}
customElements.define('templates-view', TemplatesView);
screen('templates', 'templates-view', {
  load: () => {
    loadCategories();
    loadTemplates();
  },
  title: () => t('templates'),
});

class TemplateForm extends AurilElement {
  #draft = null; // { categoryId, note, type, day, amount } as shown
  #for = '';
  #errors = {};
  #saving = false;
  #arm = new Arm(() => this.update());

  onConnect() {
    this.watch();
    this.#arm.wire(this);
    this.delegate('change', '#tpl-category', (_, el) => { this.#draft.categoryId = Number(el.value); this.update(); });
    this.delegate('input', '#tpl-note', (_, el) => { this.#draft.note = el.value; });
    this.delegate('change', '[name="tpl-type"]', (_, el) => { this.#draft.type = el.value; this.update(); });
    this.delegate('input', '#tpl-day', (_, el) => { this.#draft.day = el.value; });
    this.delegate('input', '#tpl-amount', (_, el) => {
      const clean = el.value.replace(notAmount, '');
      if (clean !== el.value) el.value = clean;
      this.#draft.amount = clean;
    });
    this.delegate('focusin', '#tpl-amount', (_, el) => el.select());
    this.delegate('submit', 'form', (e) => {
      e.preventDefault();
      this.#save();
    });
    this.delegate('click', '#tpl-delete', () => { if (this.#arm.tap('tpl-delete')) this.#delete(); });
  }

  #fresh() {
    return { categoryId: store.state.categories?.[0]?.id, note: '', type: 'expense', day: String(new Date().getDate()), amount: '0' };
  }

  #sync() {
    const s = store.state;
    const id = s.route.id;
    if (id) {
      const tp = s.templates?.find((x) => x.id === Number(id));
      if (this.#for !== `edit ${id}` && tp) {
        this.#for = `edit ${id}`;
        this.#draft = { categoryId: tp.categoryId, note: tp.note, type: tp.type, day: String(tp.day), amount: String(tp.amount) };
        this.#errors = {};
        this.#arm.reset();
      }
      return this.#for === `edit ${id}`;
    }
    if (this.#for !== 'new') {
      this.#for = 'new';
      this.#draft = this.#fresh();
      this.#errors = {};
    }
    if (this.#draft.categoryId === undefined) this.#draft.categoryId = s.categories?.[0]?.id;
    return true;
  }

  async #save() {
    if (this.#saving) return;
    const d = this.#draft;
    const body = { categoryId: d.categoryId, note: d.note.trim(), type: d.type, day: Number(d.day), amount: amountOf(d.amount) };
    if (!(body.day >= 1 && body.day <= 31)) {
      this.#errors = { day: '1–31' };
      this.update();
      return;
    }
    this.#saving = true;
    this.#errors = {};
    this.update();
    const { ledger, route } = store.state;
    try {
      if (route.id) {
        await api.updateTemplate(ledger, route.id, body);
        await loadTemplates();
        go('/templates');
      } else {
        await api.createTemplate(ledger, body);
        this.#draft = this.#fresh();
        loadTemplates();
      }
    } catch (err) {
      this.#errors = err instanceof api.OfflineError ? { '': t('needsConnection') } : { [err.field || '']: err.message };
    }
    this.#saving = false;
    this.update();
  }

  async #delete() {
    const { ledger, route } = store.state;
    try {
      await api.deleteTemplate(ledger, route.id);
      await loadTemplates();
      go('/templates');
    } catch (err) {
      this.#errors = err instanceof api.OfflineError ? { '': t('needsConnection') } : { '': err.message };
      this.update();
    }
  }

  render() {
    const s = store.state;
    if (!this.#sync()) return html`<p class="empty">${s.templates ? t('notFound') : t('loading')}</p>`;
    const d = this.#draft;
    const editing = Boolean(s.route.id);
    const cats = s.categories ?? [];
    const category = cats.find((c) => c.id === d.categoryId);
    const err = this.#errors;
    const radio = (type) => html`<label class="radio ${type}"><input type="radio" name="tpl-type" id="tpl-${type}" value="${type}" ${d.type === type ? 'checked' : ''}><span>${t(type)}</span></label>`;
    const spin = this.#saving ? icon('spinner', 'spin') : icon(editing ? 'pencil' : 'check');
    return html`<form id="tpl-form" class="form" novalidate>
      <div class="field">
        <label for="tpl-category">${t('category')}</label>
        <select id="tpl-category">${cats.map((c) => html`<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${c.name}</option>`)}</select>
        ${err.categoryId && html`<p class="error">${err.categoryId}</p>`}
      </div>
      ${category?.hasNotes && html`<div class="field">
        <label for="tpl-note">${t('note')}</label>
        <input id="tpl-note" value="${d.note}" autocomplete="off">
        ${err.note && html`<p class="error">${err.note}</p>`}
      </div>`}
      <fieldset class="types"><legend class="visually-hidden">${t('type')}</legend>${radio('expense')}${radio('income')}</fieldset>
      <div class="field">
        <label for="tpl-day">${t('day')}</label>
        <input id="tpl-day" type="number" min="1" max="31" step="1" inputmode="numeric" value="${d.day}" required>
        ${err.day && html`<p class="error">${err.day}</p>`}
      </div>
      <div class="field">
        <label for="tpl-amount">${t('amount')}</label>
        <input id="tpl-amount" type="text" inputmode="decimal" autocomplete="off" value="${d.amount}">
        ${err.amount && html`<p class="error">${err.amount}</p>`}
      </div>
      ${(err[''] || err.type) && html`<p class="error" role="alert">${err[''] || err.type}</p>`}
      ${editing
        ? html`<div class="actions">${this.#arm.button('tpl-delete', t('delete'))}<button type="submit" id="tpl-save" class="button primary" aria-label="${t('save')}">${spin}</button></div>`
        : html`<div class="actions single"><button type="submit" id="tpl-save" class="button primary wide" aria-label="${t('save')}">${spin}</button></div>`}
    </form>`;
  }
}
customElements.define('template-form', TemplateForm);

class TemplateList extends AurilElement {
  onConnect() {
    this.watch();
  }

  render() {
    const s = store.state;
    const groups = [];
    for (const tp of s.templates ?? []) {
      let g = groups.find((x) => x.categoryId === tp.categoryId);
      if (!g) groups.push((g = { categoryId: tp.categoryId, name: tp.category, items: [] }));
      g.items.push(tp);
    }
    const row = (tp) => {
      const selected = String(tp.id) === s.route.id;
      return html`<a class="row ${tp.type} ${selected ? 'selected' : ''}" id="template-${tp.id}" href="/templates/${tp.id}" ${selected ? html`aria-current="true"` : ''}>
        <span class="what"><span class="day-badge">${icon('calendar')}${tp.day}.</span>${tp.note && html`<span>${tp.note}</span>`}</span>
        <span class="amount">${money(tp.amount)}</span></a>`;
    };
    return html`<div class="card list-card">
      ${s.templates === null && html`<p class="empty">${t('loading')}</p>`}
      ${s.templates?.length === 0 && html`<p class="empty">${t('noTemplate')}</p>`}
      ${groups.map((g) => html`<h2 class="day">${g.name}</h2>${g.items.map(row)}`)}
    </div>`;
  }
}
customElements.define('template-list', TemplateList);
