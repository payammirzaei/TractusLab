"use client";

import { useI18n } from "@/components/I18nProvider";
import type { Locale } from "@/lib/i18n";

const options: Array<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "de", label: "DE" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div role="group" aria-label={t("common.language")} className="flex items-center rounded-xl border border-white/9 bg-black/15 p-1">
      {options.map((option) => (
        <button
          key={option.locale}
          type="button"
          onClick={() => setLocale(option.locale)}
          aria-pressed={locale === option.locale}
          title={option.locale === "en" ? t("common.english") : t("common.german")}
          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] transition ${locale === option.locale ? "bg-white/10 text-white shadow-sm" : "text-white/32 hover:text-white/70"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
