// Numbers, amounts and dates in the instance language and currency:
// "1.234,50 €" and "15.10.2026" in German, "€1,234.50" and "10/15/2026" in
// English. Amounts show two decimals; whole() is for chart axes.
import { store } from './state.js';

const cache = new Map();

function formatter(kind) {
  const { lang, session } = store.state;
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const currency = session?.currency || 'EUR';
  const key = `${kind} ${locale} ${currency}`;
  if (!cache.has(key)) {
    cache.set(key, kind === 'date'
      ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      : new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: kind === 'whole' ? 0 : 2, maximumFractionDigits: kind === 'whole' ? 0 : 2 }));
  }
  return cache.get(key);
}

export const money = (n) => formatter('money').format(n);

// moneyParts splits money(n) into its number and its currency sign (with
// the space beside it), so a narrow table can hide the sign and name the
// currency once in its head: [{ text, currency }].
export function moneyParts(n) {
  const parts = formatter('money').formatToParts(n);
  return parts.map((p, i) => ({
    text: p.value,
    currency: p.type === 'currency' || (p.type === 'literal' && (parts[i - 1]?.type === 'currency' || parts[i + 1]?.type === 'currency')),
  }));
}

// currencySign is the instance currency's sign, "€".
export const currencySign = () => moneyParts(0).filter((p) => p.currency).map((p) => p.text).join('').trim();
export const whole = (n) => formatter('whole').format(n);
// monthName formats "YYYY-MM" as "Oktober 2026".
export function monthName(ym) {
  const { lang } = store.state;
  const key = `month ${lang}`;
  if (!cache.has(key)) cache.set(key, new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
  return cache.get(key).format(new Date(`${ym}-01T00:00:00Z`));
}
// date formats "YYYY-MM-DD".
export const date = (iso) => formatter('date').format(new Date(`${iso}T00:00:00Z`));
