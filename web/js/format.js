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
export const whole = (n) => formatter('whole').format(n);
// date formats "YYYY-MM-DD".
export const date = (iso) => formatter('date').format(new Date(`${iso}T00:00:00Z`));
