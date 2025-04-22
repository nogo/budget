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
  const t = (k: string) => translations[k] || k;
  return t;
}
