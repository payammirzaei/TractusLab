"use client";

import Link from "next/link";
import { LearnerNav } from "@/components/LearnerNav";
import { useI18n } from "@/components/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();
  const journey = [
    ["01", t("home.journey1Title"), t("home.journey1Text")],
    ["02", t("home.journey2Title"), t("home.journey2Text")],
    ["03", t("home.journey3Title"), t("home.journey3Text")],
    ["04", t("home.journey4Title"), t("home.journey4Text")],
  ] as const;

  return (
    <main className="min-h-screen pb-20">
      <LearnerNav active="home" eyebrow={t("home.navEyebrow")} />
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="grid min-h-[76vh] items-center gap-8 py-10 md:py-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/13 bg-emerald-300/[0.045] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/68"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(15,159,118,.34)]" />{t("home.badge")}</div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-0.06em] md:text-7xl xl:text-[5.5rem]">{t("home.headlineBefore")} <span className="text-blue-700">{t("home.headlineAction")}</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/50 md:text-lg">{t("home.intro")}</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/path" className="rounded-xl bg-emerald-300 px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_38px_rgba(15,159,118,.16)] transition hover:-translate-y-0.5 hover:bg-emerald-600">{t("home.startPath")}</Link>
              <Link href="/scenarios" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">{t("home.explore")}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white/27"><span>{t("home.statSimulations")}</span><span>{t("home.statDepths")}</span><span>{t("home.statBoss")}</span><span>{t("home.statProgress")}</span></div>
          </div>

          <div className="surface-hero relative overflow-hidden p-4 md:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-300/[0.12] blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between"><div><p className="eyebrow">{t("home.preview")}</p><p className="mt-1 text-xs text-white/28">{t("home.previewMeta")}</p></div><span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{t("home.step")}</span></div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
                <DemoCompany label={t("home.supplier")} detail={t("home.supplierDetail")} symbol="P" />
                <div className="text-center"><span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-white/22 sm:block">{t("home.exchange")}</span><div className="mt-1 text-3xl text-blue-600">↔</div></div>
                <DemoCompany label={t("home.manufacturer")} detail={t("home.manufacturerDetail")} symbol="C" />
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-700">{t("home.catalogNow")}</p><span className="text-[10px] text-white/24">{t("home.businessMeaning")}</span></div>
                <p className="mt-3 text-lg font-semibold leading-7 tracking-[-0.02em]">{t("home.catalogQuestion")}</p>
                <p className="mt-2 text-sm leading-6 text-white/38">{t("home.catalogAnswer")}</p>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {[t("home.identity"), t("home.catalog"), t("home.policy"), t("home.agreement"), t("home.transfer")].map((item, index) => <div key={`${item}-${index}`} className={`rounded-xl border px-2 py-2 text-center text-[9px] font-semibold ${index === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : index === 1 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-white/6 text-white/20"}`}>{index === 0 ? "✓ " : ""}{item}</div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("home.learningModel")}</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">{t("home.learningHeadline")}</h2></div><Link href="/path" className="button-secondary">{t("home.fullPath")}</Link></div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {journey.map(([number, title, text], index) => <div key={number} className="surface-card p-5"><span className={`text-xs font-black ${index % 2 === 0 ? "text-emerald-700" : "text-blue-700"}`}>{number}</span><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h3><p className="mt-2 text-sm leading-6 text-white/38">{text}</p></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoCompany({ label, detail, symbol }: { label: string; detail: string; symbol: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white p-3 text-center shadow-sm md:p-5"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700">{symbol}</div><p className="mt-3 truncate text-sm font-semibold">{label}</p><p className="mt-1 text-[10px] text-white/27">{detail}</p></div>;
}
