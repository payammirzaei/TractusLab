"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LearnerNav } from "@/components/LearnerNav";
import { ProgressRing } from "@/components/ProgressRing";
import { useI18n } from "@/components/I18nProvider";
import { useLearningProgress } from "@/components/useLearningProgress";
import { learningScenarios } from "@/data/catalog";
import {
  filterScenarioDiscovery,
  recommendedScenario,
  scenarioDiscoveryRows,
  type ScenarioDiscoveryFilter,
} from "@/lib/discovery";

const scenarioIcons: Record<string, string> = {
  "battery-pcf": "CO₂",
  "digital-twin": "◇",
  traceability: "↗",
  "demand-capacity": "≈",
  "quality-management": "✓",
  "circular-economy": "∞",
};

export function ScenarioHub() {
  const { locale, t } = useI18n();
  const { progress, ready, clearProgress } = useLearningProgress();
  const [filter, setFilter] = useState<ScenarioDiscoveryFilter>("all");
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const filters: Array<{ id: ScenarioDiscoveryFilter; label: string }> = [
    { id: "all", label: t("scenarios.all") },
    { id: "in-progress", label: t("scenarios.inProgress") },
    { id: "not-started", label: t("scenarios.notStarted") },
    { id: "complete", label: t("scenarios.completed") },
  ];

  const overview = useMemo(() => {
    const rows = scenarioDiscoveryRows(learningScenarios, progress);
    const average = rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length);
    const completed = rows.filter((row) => row.status === "complete").length;
    const active = rows.filter((row) => row.status === "in-progress").length;
    return {
      rows,
      average,
      completed,
      active,
      recommended: recommendedScenario(rows),
      visible: filterScenarioDiscovery(rows, filter, query),
    };
  }, [filter, locale, progress, query]);

  function resetProgress() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearProgress();
    setConfirmReset(false);
  }

  return (
    <main className="min-h-screen pb-20">
      <LearnerNav active="scenarios" eyebrow={t("scenarios.navEyebrow")} />
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="grid gap-5 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <div className="surface-hero relative overflow-hidden p-6 md:p-9">
            <div className="absolute -right-12 -top-14 h-56 w-56 rounded-full bg-emerald-300/[0.07] blur-3xl" />
            <div className="relative">
              <p className="eyebrow">{t("scenarios.library")}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] md:text-6xl">{t("scenarios.headline")}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/52 md:text-lg md:leading-8">{t("scenarios.intro")}</p>

              {ready && overview.recommended && (
                <Link href={`/learn/${overview.recommended.scenario.id}`} className="group mt-7 inline-flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.075] px-4 py-3.5 transition hover:border-emerald-300/35 hover:bg-emerald-300/[0.11]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300 text-sm font-black text-[#07110f]">→</span>
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">{t("scenarios.recommended")}</span>
                    <span className="mt-0.5 block font-semibold text-white">{overview.recommended.scenario.shortTitle}</span>
                  </span>
                  <span className="ml-2 text-sm text-white/35 transition group-hover:translate-x-1 group-hover:text-white/65">{t("scenarios.openLab")}</span>
                </Link>
              )}
            </div>
          </div>

          <aside className="surface-card flex items-center justify-between gap-5 p-5 md:p-6 lg:flex-col lg:items-stretch lg:justify-center">
            <ProgressRing value={ready ? overview.average : 0} label={locale === "de" ? "gesamt" : "overall"} size="lg" />
            <div className="min-w-0 flex-1 lg:flex-none">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/28">{t("scenarios.learningSnapshot")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric value={ready ? overview.completed : "—"} label={t("scenarios.completed")} />
                <Metric value={ready ? overview.active : "—"} label={t("scenarios.inProgress")} />
              </div>
              <p className="mt-4 text-xs leading-5 text-white/34">{t("scenarios.progressLocal")}</p>
            </div>
          </aside>
        </section>

        <section className="sticky top-[102px] z-20 -mx-2 mb-5 rounded-2xl border border-[#dce8e4] bg-white/95 p-2 shadow-[0_12px_34px_rgba(23,68,61,.08)] backdrop-blur-xl md:top-[70px] md:mx-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {filters.map((item) => {
                const count = item.id === "all" ? overview.rows.length : overview.rows.filter((row) => row.status === item.id).length;
                return (
                  <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${filter === item.id ? "bg-blue-50 text-blue-700" : "text-[#647977] hover:bg-[#f1f7f5] hover:text-[#15302f]"}`}>
                    {item.label} <span className={`ml-1 ${filter === item.id ? "text-blue-500" : "text-[#91a29f]"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative min-w-0 md:w-72">
              <span className="sr-only">{t("scenarios.search")}</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5b716d]">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("scenarios.searchPlaceholder")}
                className="w-full rounded-xl border border-[#cddbd7] bg-white py-2.5 pl-8 pr-3 text-sm font-medium text-[#15302f] outline-none transition placeholder:text-[#8da19d] hover:border-[#b8ccc6] focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        {!ready ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label={t("scenarios.library")}>
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton-card h-[320px] rounded-[1.75rem]" />)}
          </section>
        ) : overview.visible.length === 0 ? (
          <section className="surface-card grid min-h-64 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-xl text-white/35">⌕</div>
              <h2 className="mt-4 text-xl font-semibold">{t("scenarios.noMatch")}</h2>
              <p className="mt-2 text-sm text-white/40">{t("scenarios.noMatchHint")}</p>
              <button onClick={() => { setFilter("all"); setQuery(""); }} className="button-secondary mt-5">{t("scenarios.showAll")}</button>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.visible.map((row, index) => {
              const scenario = row.scenario;
              const statusLabel = row.status === "complete" ? t("scenarios.completed") : row.status === "in-progress" ? t("scenarios.inProgress") : t("scenarios.notStarted");
              return (
                <Link key={scenario.id} href={`/learn/${scenario.id}`} className="scenario-card group relative overflow-hidden rounded-[1.75rem] border border-white/9 bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/22 hover:bg-white/[0.04] hover:shadow-[0_24px_70px_rgba(0,0,0,.2)] md:p-6">
                  <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-emerald-300/[0.045] blur-2xl transition group-hover:bg-emerald-300/[0.08]" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/20 text-sm font-black text-emerald-200">{scenarioIcons[scenario.id] ?? String(index + 1).padStart(2, "0")}</div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${row.status === "complete" ? "border-emerald-300/18 bg-emerald-300/[0.07] text-emerald-200/75" : row.status === "in-progress" ? "border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-100/65" : "border-white/8 text-white/28"}`}>{statusLabel}</span>
                    </div>

                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/26">{scenario.useCase}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{scenario.shortTitle}</h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/45">{scenario.goal}</p>

                    <div className="mt-5 flex flex-wrap gap-1.5 text-[10px] text-white/34">
                      <span className="rounded-lg border border-white/7 bg-black/10 px-2.5 py-1.5">{scenario.steps.length} {t("scenarios.steps")}</span>
                      <span className="rounded-lg border border-white/7 bg-black/10 px-2.5 py-1.5">{scenario.challenges.length} {t("scenarios.diagnostics")}</span>
                      <span className="max-w-full truncate rounded-lg border border-white/7 bg-black/10 px-2.5 py-1.5">{scenario.asset}</span>
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="flex items-center justify-between text-[11px] font-medium text-white/32"><span>{row.percent}% {t("scenarios.learned")}</span><span>{row.solved}/{scenario.challenges.length} {t("scenarios.fixes")}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300 transition-all duration-700" style={{ width: `${row.percent}%` }} /></div>
                      <div className="mt-5 flex items-center justify-between"><span className="text-sm font-semibold text-white/74">{row.status === "in-progress" ? t("scenarios.continue") : row.status === "complete" ? t("scenarios.review") : t("scenarios.start")}</span><span className="text-emerald-300 transition group-hover:translate-x-1">→</span></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {ready && Object.keys(progress).length > 0 && (
          <section className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 py-8">
            <div><p className="text-sm font-semibold text-white/65">{t("scenarios.cleanSlate")}</p><p className="mt-1 text-xs text-white/30">{t("scenarios.cleanSlateHint")}</p></div>
            <div className="flex items-center gap-2">
              {confirmReset && <button onClick={() => setConfirmReset(false)} className="button-ghost">{t("scenarios.cancel")}</button>}
              <button onClick={resetProgress} className={confirmReset ? "button-danger" : "button-ghost"}>{confirmReset ? t("scenarios.confirmReset") : t("scenarios.reset")}</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="rounded-2xl border border-white/7 bg-black/15 p-3"><p className="text-xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/26">{label}</p></div>;
}
