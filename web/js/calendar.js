// Months and days as the browser routes and the API spell them: "YYYY-MM"
// and "YYYY-MM-DD". Today is the device's local day.
export const pad = (n) => String(n).padStart(2, '0');

export function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// validYm returns s when it names a real month, else null.
export function validYm(s) {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? '');
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? s : null;
}

export function shiftYm(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
}

export function daysIn(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// dateIn is that day of the month, or the month's last day when it is
// shorter; without a day, today's day number.
export function dateIn(ym, day = new Date().getDate()) {
  return `${ym}-${pad(Math.min(day, daysIn(ym)))}`;
}

export const dayOf = (iso) => Number(iso.slice(8, 10));
