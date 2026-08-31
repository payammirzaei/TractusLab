"use client";

import Link from "next/link";
import { LearnerNav } from "@/components/LearnerNav";
import { ProgressRing } from "@/components/ProgressRing";
import { useBossScores } from "@/components/useBossScores";
import { useI18n } from "@/components/I18nProvider";
import { useLearningProgress } from "@/components/useLearningProgress";
import { getScenarioById } from "@/data/catalog";
import { competencies, curriculumMissions } from "@/data/curriculum";
import {
  competencyEarned,
  curriculumCompletionPercent,
  masteredBossCount,
  missionState,
  recommendedMission,
} from "@/lib/curriculum";

export function CurriculumPath() {
  const { t } = useI18n();
  const { progress, ready: progressReady } = useLearningProgress();
  const { scores, ready: scoresReady } = useBossScores();
  const ready = progressReady && scoresReady;

  const percent = curriculumCompletionPercent(curriculumMissions, progress, scores);
  const recommended = recommendedMission(curriculumMissions, progress, scores);
  const earned = competencies.filter((item) => competencyEarned(item, progress, scores));
  const bossMastery = masteredBossCount(scores);
  const missionTitle = (id: string) => t(`path.missions.${id}.title`);
  const missionDescription = (id: string) => t(`path.missions.${id}.description`);
  const stateLabel = (state: "locked" | "available" | "in-progress" | "complete") => {
    if (state === "locked") return t("path.locked");
    if (state === "available") return t("path.ready");
    if (state === "in-progress") return t("path.inProgress");
    return t("path.complete");
  };

  return (
    <main className="min-h-screen pb-20">
      <LearnerNav active="path" eyebrow={t("path.navEyebrow")} />
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <section className="grid gap-5 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="surface-hero relative overflow-hidden p-6 md:p-9">
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-300/[0.045] blur-3xl" />
            <div className="relative">
              <p className="eyebrow">{t("path.missionPath")}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] md:text-6xl">{t("path.headline")}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/52 md:text-lg md:leading-8">{t("path.intro")}</p>

              {ready && recommended && (
                <Link href={recommended.scenarioId ? `/learn/${recommended.scenarioId}` : "/path"} className="group mt-7 inline-flex max-w-full items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.075] px-4 py-3.5 transition hover:border-emerald-300/35 hover:bg-emerald-300/[0.11]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300 text-sm font-black text-[#07110f]">→</span>
                  <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">{t("path.recommended")}</span><span className="mt-0.5 block truncate font-semibold text-white">{missionTitle(recommended.id)}</span></span>
                  <span className="ml-auto hidden text-sm text-white/35 transition group-hover:translate-x-1 group-hover:text-white/65 sm:block">{t("path.continue")}</span>
                </Link>
              )}
            </div>
          </div>

          <aside className="surface-card flex items-center justify-between gap-5 p-5 md:p-6 lg:flex-col lg:items-stretch lg:justify-center">
            <ProgressRing value={ready ? percent : 0} label={t("path.pathLabel")} size="lg" />
            <div className="flex-1 lg:flex-none">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/28">{t("path.masterySnapshot")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric value={ready ? earned.length : "—"} label={t("path.ofSkills", { total: competencies.length })} />
                <Metric value={ready ? Math.min(bossMastery, 3) : "—"} label={t("path.ofBoss")} />
              </div>
              <p className="mt-4 text-xs leading-5 text-white/34">{t("path.masteryHint")}</p>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="surface-card overflow-hidden p-4 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-5">
              <div><p className="eyebrow">{t("path.yourRoute")}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">{t("path.milestones")}</h2></div>
              <Link href="/scenarios" className="button-ghost">{t("path.browseFreely")}</Link>
            </div>

            <div className="relative mt-5">
              <div className="absolute bottom-8 left-[25px] top-8 w-px bg-gradient-to-b from-emerald-300/35 via-white/10 to-amber-300/25 md:left-[31px]" aria-hidden="true" />
              <div className="space-y-3">
                {curriculumMissions.map((mission, index) => {
                  const state = missionState(mission, curriculumMissions, progress, scores);
                  const scenario = mission.scenarioId ? getScenarioById(mission.scenarioId) : null;
                  const prerequisites = mission.prerequisiteIds.map((id) => missionTitle(id));
                  const isRecommended = recommended?.id === mission.id;
                  const isMastery = mission.kind === "mastery";
                  const icon = state === "complete" ? "✓" : state === "locked" ? "·" : isMastery ? "★" : String(index + 1).padStart(2, "0");

                  const card = (
                    <div className={`group relative grid gap-4 rounded-[1.5rem] border p-4 pl-[74px] transition md:grid-cols-[1fr_auto] md:items-center md:p-5 md:pl-[88px] ${state === "complete" ? "border-emerald-300/18 bg-emerald-300/[0.035]" : isRecommended ? "border-emerald-300/30 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,.14)]" : state === "locked" ? "border-white/[0.055] bg-black/10" : isMastery ? "border-amber-300/16 bg-amber-300/[0.025]" : "border-white/8 bg-white/[0.018] hover:border-white/13"}`}>
                      <div className={`absolute left-3 top-1/2 z-10 grid h-[50px] w-[50px] -translate-y-1/2 place-items-center rounded-2xl border text-xs font-black md:left-4 md:h-[58px] md:w-[58px] ${state === "complete" ? "border-emerald-300/25 bg-emerald-300 text-[#07110f]" : isRecommended ? "border-emerald-300/35 bg-[#0e211c] text-emerald-200 shadow-[0_0_28px_rgba(110,231,183,.11)]" : state === "locked" ? "border-white/7 bg-[#08100e] text-white/18" : isMastery ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-200" : "border-white/10 bg-[#0b1512] text-white/55"}`}>{icon}</div>

                      <div className={state === "locked" ? "opacity-58" : ""}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${state === "complete" ? "border-emerald-300/14 text-emerald-200/65" : state === "locked" ? "border-white/7 text-white/23" : isRecommended ? "border-emerald-300/18 text-emerald-200/72" : isMastery ? "border-amber-300/15 text-amber-100/62" : "border-white/8 text-white/36"}`}>{stateLabel(state)}</span>
                          {isRecommended && <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">{t("path.recommendedBadge")}</span>}
                          {isMastery && <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/55">{t("path.masteryGate")}</span>}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] md:text-xl">{missionTitle(mission.id)}</h3>
                        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/40">{missionDescription(mission.id)}</p>
                        {prerequisites.length > 0 && state === "locked" && <p className="mt-2 text-[11px] text-white/24">{t("path.unlockAfter", { items: prerequisites.join(" · ") })}</p>}
                        {isMastery && state !== "locked" && <div className="mt-3 flex max-w-md items-center gap-3 rounded-xl border border-amber-300/10 bg-black/10 px-3 py-2 text-xs"><span className="text-white/35">{t("path.bossFights")}</span><span className="ml-auto font-semibold text-amber-200">{Math.min(bossMastery, 3)} / 3</span></div>}
                      </div>

                      <div className="md:text-right">
                        {scenario && state !== "locked" ? <span className={`inline-flex rounded-xl px-3.5 py-2 text-xs font-semibold ${isRecommended ? "bg-emerald-300 text-[#07110f]" : "border border-white/9 bg-white/[0.025] text-white/60"}`}>{state === "complete" ? t("path.review") : state === "in-progress" ? t("path.continue").replace(" →", "") : t("path.start")} →</span> : isMastery && state === "complete" ? <span className="text-xs font-semibold text-emerald-300">{t("path.masteryAchieved")}</span> : null}
                      </div>
                    </div>
                  );

                  if (scenario && state !== "locked") return <Link key={mission.id} href={`/learn/${scenario.id}`} className="block outline-none">{card}</Link>;
                  return <div key={mission.id}>{card}</div>;
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card p-5">
              <p className="eyebrow">{t("path.branches")}</p>
              <div className="mt-5 space-y-3 text-sm">
                <Branch label={t("path.foundation")} detail={t("path.foundationDetail")} active />
                <Branch label={t("path.twinTraceability")} detail={t("path.twinTraceabilityDetail")} />
                <Branch label={t("path.planning")} detail={t("path.planningDetail")} />
                <Branch label={t("path.diagnostics")} detail={t("path.diagnosticsDetail")} />
              </div>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between"><p className="eyebrow">{t("path.competencies")}</p><span className="text-xs text-white/30">{ready ? `${earned.length}/${competencies.length}` : "—"}</span></div>
              <div className="mt-4 space-y-2">
                {competencies.map((competency) => {
                  const done = ready && competencyEarned(competency, progress, scores);
                  return <div key={competency.id} className={`flex items-start gap-3 rounded-xl border p-3 ${done ? "border-emerald-300/12 bg-emerald-300/[0.035]" : "border-white/6 bg-black/10"}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${done ? "bg-emerald-300 text-[#07110f]" : "border border-white/10 text-white/20"}`}>{done ? "✓" : ""}</span><div><p className={`text-xs font-semibold ${done ? "text-white/72" : "text-white/35"}`}>{t(`path.skills.${competency.id}.label`)}</p><p className="mt-1 text-[11px] leading-5 text-white/26">{t(`path.skills.${competency.id}.description`)}</p></div></div>;
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="rounded-2xl border border-white/7 bg-black/15 p-3"><p className="text-xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">{label}</p></div>;
}

function Branch({ label, detail, active = false }: { label: string; detail: string; active?: boolean }) {
  return <div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.45)]" : "bg-white/16"}`} /><div><p className="font-semibold text-white/62">{label}</p><p className="mt-1 text-xs leading-5 text-white/30">{detail}</p></div></div>;
}
