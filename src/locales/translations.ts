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

  // @ts-ignore
  translationsMap[fileName] =
    allLocalesModules[path].default || allLocalesModules[path];
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
    const str = translations[key] || key;
    if (params) {
      const parts = str.split(/(\$\d+)/g); // Split by $1, $2, etc.
      return parts.map((part, idx) => {
        const match = part.match(/^\$(\d+)$/);
        if (match) {
          const paramIdx = parseInt(match[1], 10) - 1;
          return params[paramIdx] !== undefined ? params[paramIdx] : part;
        }
        return part;
      });
    } else {
      return str;
    }
  };
}
