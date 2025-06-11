import { useLocale } from "~/components/Locales";

const allLocalesModules = import.meta.glob(
  ["../**/*.locales.ts", "./**/*.locales.ts"],
  {
    eager: true,
  },
);

type Translations = Record<string, Record<string, string>>;
export type Locale = "en" | "de";

const translationsMap: Record<string, Translations> = {};

const ROOT_KEY = "root";
for (const path in allLocalesModules) {
  let fileName =
    path
      .split("/")
      .pop()
      ?.replace(/\.locales\.(ts|js)$/, "") || "root";

  const module = allLocalesModules[path] as { default?: any };
  translationsMap[fileName] = module.default || module;
}

export function useTranslation(componentKey?: string) {
  const { locale } = useLocale();
  let key = componentKey || ROOT_KEY;
  let translations = translationsMap[key]?.[locale];
  if (!translations && componentKey) {
    translations = translationsMap[ROOT_KEY]?.[locale];
  }
  translations = translations || {};

  return (key: string, params?: any[]) => {
    let str = translations[key] || key;
    if (params) {
      // Replace $1, $2, ... with params[0], params[1], ...
      str = str.replace(/\$(\d+)/g, (_, n) => {
        const idx = parseInt(n, 10) - 1;
        return params[idx] !== undefined ? String(params[idx]) : `$${n}`;
      });
    }
    return str;
  };
}
