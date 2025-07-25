import { env } from "~/lib/env/client";

const numberFormat = new Intl.NumberFormat(env.VITE_LOCALE, {
  style: "currency",
  currency: env.VITE_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeNumberFormat = new Intl.NumberFormat(env.VITE_LOCALE, {
  style: "currency",
  currency: env.VITE_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats a number as currency.
 * @param value The number to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(value: number): string {
  return numberFormat.format(value);
}

/**
 * Formats a number as currency without decimal places.
 * @param value The number to format.
 * @returns The formatted currency string without decimals.
 */
export function formatCurrencyWhole(value: number): string {
  return wholeNumberFormat.format(value);
}