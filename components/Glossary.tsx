"use client";

import { useI18n } from "@/components/I18nProvider";
import { glossary } from "@/data/glossary";
import { glossaryDefinition } from "@/lib/glossary-i18n";

export function Glossary({ terms }: { terms: string[] }) {
  const { locale, t } = useI18n();
  const uniqueTerms = [...new Set(terms)].filter((term) => term in glossary);
  if (uniqueTerms.length === 0) return null;

  return (
    <details className="group rounded-2xl border border-white/10 bg-black/15 p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-white/65 marker:hidden">
        {t("glossary.title")} <span className="ml-1 text-white/30">({uniqueTerms.length})</span>
      </summary>
      <div className="mt-4 space-y-3">
        {uniqueTerms.map((term) => (
          <div key={term}>
            <p className="text-sm font-semibold text-emerald-200">{term}</p>
            <p className="mt-1 text-sm leading-6 text-white/48">{glossaryDefinition(term as keyof typeof glossary, locale)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
