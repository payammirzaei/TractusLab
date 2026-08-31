"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setCatalogLocale } from "@/data/catalog";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  translate,
  type Locale,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    setCatalogLocale(stored);
    setLocaleState(stored);
    document.documentElement.lang = stored;
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setCatalogLocale(nextLocale);
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => translate(locale, key, values),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
