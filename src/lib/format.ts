import { env } from "~/lib/env";

const numberFormat = new Intl.NumberFormat(env.VITE_LOCALE, {
  style: "currency",
  currency: env.VITE_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as currency.
 * @param value The number to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(value: number): string {
  return numberFormat.format(value);
}
