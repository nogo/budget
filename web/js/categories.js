// Categories (/categories, /categories/{id}): the form beside the list, as
// on the other pages: it adds a category, or edits the one whose row was
// tapped. A row deletes with two taps; a category still in use is refused,
// and the row says why. The installed version shows under the list.
import { AurilElement, html } from '../auril/index.js';
import { store } from './state.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import * as api from './api.js';
import { loadCategories } from './data.js';
import { screen } from './screens.js';
import { go } from './nav.js';
import { Arm } from './arm.js';

const message = (err) => (err instanceof api.OfflineError ? t('needsConnection') : err.message);

class CategoriesView extends AurilElement {
  #add = { name: '', hasNotes: false };
  #edit = null; // { id, name, hasNotes } while one is open
  #errors = {}; // "add", "edit" or "cat-ID" -> message
  #saving = false;
  #arm = new Arm(() => this.update());

  onConnect() {
    this.watch();
    this.#arm.wire(this);
    this.delegate('input', '#cat-name', (_, el) => { this.#add.name = el.value; });
    this.delegate('change', '#cat-notes', (_, el) => { this.#add.hasNotes = el.checked; });
    this.delegate('input', '#edit-name', (_, el) => { this.#edit.name = el.value; });
    this.delegate('change', '#edit-notes', (_, el) => { this.#edit.hasNotes = el.checked; });
    this.delegate('submit', '#cat-add', (e) => {
      e.preventDefault();
      this.#create();
    });
    this.delegate('submit', '#cat-edit', (e) => {
      e.preventDefault();
      this.#saveEdit();
    });
    this.delegate('click', '[data-arm]', (_, el) => {
      const key = el.dataset.arm;
      delete this.#errors[key];
      if (this.#arm.tap(key)) this.#delete(key, Number(key.slice('cat-delete-'.length)));
    });
  }

  async #create() {
    if (this.#saving) return;
    this.#saving = true;
    this.update();
    try {
      await api.createCategory(store.state.ledger, { name: this.#add.name.trim(), hasNotes: this.#add.hasNotes });
      this.#add = { name: '', hasNotes: false };
      delete this.#errors.add;
      await loadCategories();
    } catch (err) {
      this.#errors.add = message(err);
    }
    this.#saving = false;
    this.update();
  }

  async #saveEdit() {
    if (this.#saving) return;
    this.#saving = true;
    this.update();
    try {
      await api.updateCategory(store.state.ledger, this.#edit.id, { name: this.#edit.name.trim(), hasNotes: this.#edit.hasNotes });
      delete this.#errors.edit;
      await loadCategories();
      go('/categories');
    } catch (err) {
      this.#errors.edit = message(err);
    }
    this.#saving = false;
    this.update();
  }

  async #delete(key, id) {
    try {
      await api.deleteCategory(store.state.ledger, id);
      await loadCategories();
    } catch (err) {
      this.#errors[key] = message(err);
      this.update();
    }
  }

  render() {
    const s = store.state;
    const id = s.route.id;
    if (!id) this.#edit = null;
    const cat = id && s.categories?.find((c) => c.id === Number(id));
    if (cat && this.#edit?.id !== cat.id) {
      this.#edit = { id: cat.id, name: cat.name, hasNotes: cat.hasNotes };
      delete this.#errors.edit;
    }
    const spin = (i) => (this.#saving ? icon('spinner', 'spin') : icon(i));
    const addForm = html`<form id="cat-add" class="form">
      <div class="field">
        <label for="cat-name">${t('newCategory')}</label>
        <input id="cat-name" value="${this.#add.name}" required autocomplete="off" ${this.#errors.add ? html`aria-invalid="true" aria-describedby="add-error"` : ''}>
        ${this.#errors.add && html`<p class="error" id="add-error" role="alert">${this.#errors.add}</p>`}
      </div>
      <label class="check"><input type="checkbox" id="cat-notes" ${this.#add.hasNotes ? 'checked' : ''}>${t('hasNotesLabel')}</label>
      <div class="actions single"><button type="submit" class="button primary wide" id="cat-save" aria-label="${t('save')}">${spin('check')}</button></div>
    </form>`;
    const editForm = !this.#edit
      ? html`<p class="empty">${s.categories ? t('notFound') : t('loading')}</p>`
      : html`<form id="cat-edit" class="form">
        <div class="field">
          <label for="edit-name">${t('name')}</label>
          <input id="edit-name" value="${this.#edit.name}" required autocomplete="off" ${this.#errors.edit ? html`aria-invalid="true" aria-describedby="edit-error"` : ''}>
          ${this.#errors.edit && html`<p class="error" id="edit-error" role="alert">${this.#errors.edit}</p>`}
        </div>
        <label class="check"><input type="checkbox" id="edit-notes" ${this.#edit.hasNotes ? 'checked' : ''}>${t('hasNotesLabel')}</label>
        <div class="actions">
          <a class="button secondary" href="/categories" id="edit-cancel">${t('cancel')}</a>
          <button type="submit" class="button primary" id="edit-save" aria-label="${t('save')}">${spin('pencil')}</button>
        </div>
      </form>`;
    const row = (c) => {
      const key = `cat-delete-${c.id}`;
      const selected = String(c.id) === id;
      return html`<li class="cat-row ${selected ? 'selected' : ''}" id="cat-${c.id}">
        <a class="cat-link" href="/categories/${c.id}" aria-label="${t('edit', c.name)}" ${selected ? html`aria-current="true"` : ''}>
          <span class="cat-name">${c.name}${c.hasNotes && html` <span class="hint">${t('withNotes')}</span>`}</span>
          ${icon('pencil')}
        </a>
        ${this.#arm.button(key, t('deleteNamed', c.name), 'ghost-danger')}
        ${this.#errors[key] && html`<p class="error row-error" role="alert">${this.#errors[key]}</p>`}
      </li>`;
    };
    return html`<main class="page split">
      <aside class="form-col"><div class="card form-card">${id ? editForm : addForm}</div></aside>
      <section class="list-col">
        <div class="card list-card">
          ${!s.categories && html`<p class="empty">${t('loading')}</p>`}
          <ul class="cat-list">${(s.categories ?? []).map(row)}</ul>
        </div>
        <p class="app-version">Budget v${s.session?.version ?? ''}</p>
      </section>
    </main>`;
  }
}
customElements.define('categories-view', CategoriesView);
screen('categories', 'categories-view', {
  load: loadCategories,
  title: (s) => (s.route.id ? t('editCategory') : t('categories')),
});
