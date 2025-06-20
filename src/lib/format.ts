import { env } from "~/lib/env";

const numberFormat = new Intl.NumberFormat(env.PUBLIC_LOCALE, {
  style: "currency",
  currency: env.PUBLIC_CURRENCY,
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
