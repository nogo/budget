import { env } from "~/lib/env/client";

export interface ParsedSearchQuery {
  textQuery: string;
  categories: string[];
  amounts: number[];
}

export function parseSearchQuery(query?: string, categoryNames: string[] = []): ParsedSearchQuery | undefined {
  if (!query || query.trim() === '') return undefined;

  // Use Unicode word characters to support German umlauts (ä, ö, ü, ß)
  const categoryMatches = query.match(/#([\p{L}\p{N}_]+)/giu) || [];
  const hashtagCategories = categoryMatches.map(match => match.substring(1).toLowerCase());

  // Find actual category names (partial match, case insensitive)
  const categories = hashtagCategories.flatMap(hashtagCat => {
    const matchingCategories = categoryNames.filter(cat =>
      cat && cat.toLowerCase().includes(hashtagCat)
    );
    return matchingCategories;
  });

  // Parse amount filters (=123,45 or =123.45)
  const amountMatches = query.match(/=([0-9]+[,.][0-9]+|[0-9]+)/g) || [];
  const amounts = amountMatches.map(match => {
    const amountStr = match.substring(1); // Remove '=' prefix
    return parseAmount(amountStr);
  }).filter((amount): amount is number => amount !== null);

  const textQuery = query.replace(/#[\p{L}\p{N}_]+/giu, '').replace(/=([0-9]+[,.][0-9]+|[0-9]+)/g, '').trim();

  return { categories, amounts, textQuery };
}

export function parseAmount(amountStr: string): number | null {
  // Remove currency symbol and whitespace
  const cleanAmount = amountStr.replace(/[^\d,.-]/g, '');
  
  // Handle locale-specific decimal delimiter
  const locale = env.VITE_LOCALE;
  const isGermanLocale = locale.startsWith('de');
  
  let normalizedAmount = cleanAmount;
  if (isGermanLocale) {
    // For German locale, comma is decimal separator
    // Replace comma with dot for parsing
    normalizedAmount = cleanAmount.replace(',', '.');
  }
  
  const parsed = parseFloat(normalizedAmount);
  return isNaN(parsed) ? null : parsed;
}