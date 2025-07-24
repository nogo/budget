import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale } from "~/locales/translations";

export function detectLocale(): Locale {
  const supported: Locale[] = ["en", "de"];
  if (typeof window === "undefined") {
    return "en";
  }
  const browserLang =
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    "en";
  const short = browserLang.slice(0, 2).toLowerCase();
  return supported.includes(short as Locale) ? (short as Locale) : "en";
}

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
}>({
  locale: "en",
  setLocale: () => {},
});

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
