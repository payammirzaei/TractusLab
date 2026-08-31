"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";

export type LearnerNavSection = "home" | "path" | "scenarios" | "learn" | "profile" | "account" | "author";

const items: Array<{ id: LearnerNavSection; href: string; labelKey: string; shortKey: string }> = [
  { id: "path", href: "/path", labelKey: "nav.path", shortKey: "nav.pathShort" },
  { id: "scenarios", href: "/scenarios", labelKey: "nav.scenarios", shortKey: "nav.scenariosShort" },
  { id: "learn", href: "/learn", labelKey: "nav.learn", shortKey: "nav.learnShort" },
  { id: "profile", href: "/profile", labelKey: "nav.profile", shortKey: "nav.profile" },
];

export function LearnerNav({ active, eyebrow }: { active?: LearnerNavSection; eyebrow?: string }) {
  const { t } = useI18n();

  return (
    <header className="learner-nav">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 rounded-xl outline-none">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-sm font-black text-emerald-200 shadow-[0_8px_28px_rgba(16,185,129,.08)]">T</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-[-0.02em] text-white">TractusLab</span><span className="hidden truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/28 sm:block">{eyebrow ?? t("nav.defaultEyebrow")}</span></span>
          </Link>
        </div>

        <nav aria-label={t("nav.primary")} className="hidden items-center rounded-2xl border border-white/8 bg-black/20 p-1 md:flex">
          {items.map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${active === item.id ? "bg-white/10 text-white shadow-sm" : "text-white/42 hover:bg-white/[0.04] hover:text-white/75"}`}>{t(item.labelKey)}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/account" aria-current={active === "account" ? "page" : undefined} className={`hidden rounded-xl border px-3 py-2 text-xs font-semibold transition sm:inline-flex ${active === "account" ? "border-emerald-300/18 bg-emerald-300/[0.07] text-emerald-100" : "border-white/9 bg-white/[0.025] text-white/48 hover:border-white/16 hover:text-white/80"}`}>{t("nav.account")}</Link>
          <Link href="/author" aria-current={active === "author" ? "page" : undefined} className={`hidden rounded-xl border px-3 py-2 text-xs font-medium transition lg:inline-flex ${active === "author" ? "border-blue-300/20 bg-blue-300/[0.08] text-blue-700" : "border-white/8 text-white/30 hover:text-white/65"}`}>{t("nav.author")}</Link>
        </div>
      </div>

      <nav aria-label={t("nav.mobilePrimary")} className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/[0.055] px-3 py-2 md:hidden">
        {items.map((item) => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${active === item.id ? "bg-emerald-300/10 text-emerald-100" : "text-white/38"}`}>{t(item.shortKey)}</Link>)}
        <Link href="/account" className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold text-white/38">{t("nav.account")}</Link>
      </nav>
    </header>
  );
}
