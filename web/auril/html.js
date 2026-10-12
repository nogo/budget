const ESCAPES = /** @type {Record<string, string>} */ ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

// Trusted-markup marker. A String subclass so results coerce naturally
// (innerHTML, string concat) while nesting html`` inside html`` skips
// re-escaping instead of double-escaping. Branded with a registry symbol
// rather than `instanceof`, so two vendored copies of auril on one page
// recognise each other's results instead of double-escaping across the seam.
const RAW = Symbol.for('auril.raw');
class Raw extends String {}
/** @type {any} */ (Raw.prototype)[RAW] = true;

/** Mark trusted markup (e.g. rendered markdown). Never wrap user input. @param {unknown} value */
export const raw = (value) => new Raw(value);

/**
 * Tagged template returning an HTML string. Values are escaped by default;
 * arrays join; null/undefined/false render as nothing; nested html`` results
 * are not re-escaped.
 *
 * `0` renders as "0" — so guard with a real boolean (`items.length > 0 && …`),
 * never `items.length && …`, which prints a bare 0 when the list is empty.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1];
  }
  return new Raw(out);
}

/** @param {unknown} value @returns {string} */
function render(value) {
  if (value == null || value === false) return '';
  if (/** @type {any} */ (value)?.[RAW]) return String(value);
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}
