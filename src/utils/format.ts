import { env } from "~/env";

const numberFormat = new Intl.NumberFormat(env.NEXT_PUBLIC_LOCALE, {
  style: "currency",
  currency: env.NEXT_PUBLIC_CURRENCY,
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
