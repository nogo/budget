// Two-tap delete: the first tap turns the button into "Sure?" in place, the
// second does the work. It falls back after three seconds, on Escape and
// when focus leaves the button. No dialog.
import { html } from '../auril/index.js';
import { t } from './i18n.js';
import { icon } from './icons.js';

export class Arm {
  #key = null;
  #timer = 0;
  #changed;

  // changed runs whenever a button arms or falls back; pass the
  // component's update.
  constructor(changed) {
    this.#changed = changed;
  }

  is(key) {
    return this.#key === key;
  }

  // tap arms key, or answers true when key was armed: then do the work.
  tap(key) {
    if (this.#key === key) {
      this.reset();
      return true;
    }
    clearTimeout(this.#timer);
    this.#key = key;
    this.#timer = setTimeout(() => this.reset(), 3000);
    this.#changed();
    return false;
  }

  reset() {
    if (this.#key === null) return;
    clearTimeout(this.#timer);
    this.#key = null;
    this.#changed();
  }

  // wire makes Escape and leaving focus disarm inside el, an AurilElement.
  wire(el) {
    el.delegate('keydown', '[data-arm]', (e) => { if (e.key === 'Escape') this.reset(); });
    el.delegate('focusout', '[data-arm]', () => this.reset());
  }

  // button renders the delete button for key; label names what it deletes.
  button(key, label, cls = '') {
    const armed = this.is(key);
    return html`<button type="button" id="${key}" class="button danger ${cls} ${armed ? 'armed' : ''}" data-arm="${key}" aria-label="${armed ? t('sure') : label}">${armed ? t('sure') : icon('trash')}</button>`;
  }
}
