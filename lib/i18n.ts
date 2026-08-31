import en from "../messages/en.json";
import de from "../messages/de.json";

export const supportedLocales = ["en", "de"] as const;
export type Locale = (typeof supportedLocales)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "tractuslab-locale";

const dictionaries: Record<Locale, unknown> = { en, de };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function resolveMessage(dictionary: unknown, key: string): string | null {
  let current: unknown = dictionary;
  for (const segment of key.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : null;
}

export function translate(locale: Locale, key: string, values: Record<string, string | number> = {}): string {
  const localized = resolveMessage(dictionaries[locale], key);
  const fallback = resolveMessage(dictionaries.en, key);
  const template = localized ?? fallback ?? key;

  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = values[token];
    return value === undefined ? match : String(value);
  });
}
