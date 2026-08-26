"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBossScores } from "@/components/useBossScores";
import { useLearningProgress } from "@/components/useLearningProgress";
import { competencies, curriculumMissions } from "@/data/curriculum";
import { getScenarioById } from "@/data/catalog";
import {
  competencyEarned,
  curriculumCompletionPercent,
  masteredBossCount,
  missionState,
  recommendedMission,
} from "@/lib/curriculum";

const stateLabels = {
  locked: "Locked",
  available: "Ready",
  "in-progress": "In progress",
  complete: "Complete",
} as const;

export function CurriculumPath() {
  const { progress, ready: progressReady } = useLearningProgress();
  const { scores, ready: scoresReady } = useBossScores();
  const ready = progressReady && scoresReady;

  const summary = useMemo(() => {
    const percent = curriculumCompletionPercent(curriculumMissions, progress, scores);
    const recommended = recommendedMission(curriculumMissions, progress, scores);
    const earned = competencies.filter((item) => competencyEarned(item, progress, scores));
    return {
      percent,
      recommended,
      earned,
      bossMastery: masteredBossCount(scores),
    };
  }, [progress, scores]);

  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
          <div className="flex gap-2">
            <Link href="/scenarios" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white/80">All scenarios</Link>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 text-xs text-emerald-100/70">Guided path</span>
          </div>
        </header>

        <section className="grid gap-7 py-12 md:py-16 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Mission path</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Learn the mental model in the right order.</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
              Complete one useful business story, unlock the next concepts, then prove the knowledge in Boss Fights. No giant Tractus-X diagram on day one.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Path progress</span>
              <span>{ready ? `${summary.percent}%` : "—"}</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${ready ? summary.percent : 0}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/52">
              {ready && summary.recommended
                ? `Recommended next: ${summary.recommended.title}`
                : ready
                  ? "Path complete. You cleared the mastery gate."
                  : "Loading progress from this device…"}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          {curriculumMissions.map((mission, index) => {
            const state = missionState(mission, curriculumMissions, progress, scores);
            const scenario = mission.scenarioId ? getScenarioById(mission.scenarioId) : null;
            const prerequisites = mission.prerequisiteIds
              .map((id) => curriculumMissions.find((item) => item.id === id)?.title)
              .filter(Boolean);
            const isRecommended = summary.recommended?.id === mission.id;

            const card = (
              <div className={`rounded-[2rem] border p-5 transition md:p-7 ${
                state === "complete"
                  ? "border-emerald-300/25 bg-emerald-300/[0.055]"
                  : isRecommended
                    ? "border-emerald-300/40 bg-white/[0.045]"
                    : state === "locked"
                      ? "border-white/7 bg-black/10 opacity-60"
                      : "border-white/10 bg-white/[0.025]"
              }`}>
                <div className="grid gap-5 md:grid-cols-[72px_1fr_auto] md:items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xl font-semibold text-white/65">
                    {state === "complete" ? "✓" : String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        state === "complete"
                          ? "bg-emerald-300/10 text-emerald-200"
                          : state === "locked"
                            ? "bg-white/[0.05] text-white/35"
                            : "bg-amber-300/10 text-amber-100/70"
                      }`}>{stateLabels[state]}</span>
                      {isRecommended && <span className="text-xs font-semibold text-emerald-300">Recommended next</span>}
                      {mission.kind === "mastery" && <span className="text-xs text-white/35">Mastery gate</span>}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{mission.title}</h2>
                    <p className="mt-2 max-w-3xl leading-7 text-white/50">{mission.description}</p>

                    {prerequisites.length > 0 && state === "locked" && (
                      <p className="mt-3 text-xs text-white/30">Unlock after: {prerequisites.join(" · ")}</p>
                    )}

                    {mission.kind === "mastery" && state !== "locked" && (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/55">Boss Fights at 70+</span>
                          <span className="font-semibold text-amber-200">{Math.min(summary.bossMastery, 3)} / 3</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/35">Use any three completed scenarios. Clean diagnoses score higher; hints and wrong attempts reduce the score.</p>
                      </div>
                    )}
                  </div>

                  <div className="md:text-right">
                    {scenario && state !== "locked" ? (
                      <span className="inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-[#07110f]">
                        {state === "complete" ? "Review" : state === "in-progress" ? "Continue" : "Start"} →
                      </span>
                    ) : mission.kind === "mastery" && state === "complete" ? (
                      <span className="text-sm font-semibold text-emerald-300">Mastery achieved ✓</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );

            if (scenario && state !== "locked") {
              return <Link key={mission.id} href={`/learn/${scenario.id}`} className="block">{card}</Link>;
            }

            return <div key={mission.id}>{card}</div>;
          })}
        </section>

        <section className="mt-14 border-t border-white/10 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Competencies</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">What you can now explain or diagnose.</h2>
            </div>
            <span className="text-sm text-white/40">{ready ? `${summary.earned.length}/${competencies.length} earned` : "—"}</span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {competencies.map((competency) => {
              const earned = ready && competencyEarned(competency, progress, scores);
              return (
                <div key={competency.id} className={`rounded-3xl border p-5 ${earned ? "border-emerald-300/20 bg-emerald-300/[0.045]" : "border-white/8 bg-black/10"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{competency.label}</h3>
                    <span className={earned ? "text-emerald-300" : "text-white/20"}>{earned ? "✓" : "○"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/42">{competency.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
