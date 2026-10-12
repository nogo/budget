import { Idiomorph } from './vendor/idiomorph.js';

/**
 * Morph target's children to match an HTML string (or auril.js html`` result).
 * Non-destructive: preserves focus, selection, scroll and node identity.
 * The value of the field being typed into is never overwritten
 * (ignoreActiveValue), so typing into an input that re-renders on keystroke is
 * safe; morph resyncs the value once the input blurs.
 * Give list items stable `id` attributes so reorders pair up correctly.
 * Exempt nodes (e.g. contenteditable) via options.callbacks.beforeNodeMorphed.
 * @param {Element} target
 * @param {unknown} content
 * @param {import('./vendor/idiomorph.js').IdiomorphConfig} [options]
 */
export function morph(target, content, options = {}) {
  // Idiomorph's ignoreActiveValue skips the focused element's whole subtree,
  // not just its value — a focused <button> would keep its old label after the
  // click that changed it. Ask for the protection only when there is a value
  // being typed; nothing else focused has one to lose.
  const active = document.activeElement;
  const typing =
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    !!(/** @type {HTMLElement | null} */ (active)?.isContentEditable);
  Idiomorph.morph(target, String(content), { morphStyle: 'innerHTML', ignoreActiveValue: typing, ...options });
}
