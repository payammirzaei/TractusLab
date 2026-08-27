"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Compass, FlaskConical, ShieldCheck } from "lucide-react";
import { useBossScores } from "@/components/useBossScores";
import { useLearningProgress } from "@/components/useLearningProgress";
import { deriveLearningJourney, type JourneyStageId } from "@/lib/learning-journey";

const icons: Record<JourneyStageId, typeof Compass> = {
  discover: Compass,
  learn: BookOpen,
  practice: FlaskConical,
  validate: ShieldCheck,
  complete: CheckCircle2,
};

export function LearningJourney({ compact = false }: { compact?: boolean }) {
  const { progress, ready: progressReady } = useLearningProgress();
  const { scores, ready: scoresReady } = useBossScores();
  const journey = deriveLearningJourney(progress, scores);
  const ready = progressReady && scoresReady;

  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Learning journey</p>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{ready ? `${journey.percent}%` : "—"}</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {journey.stages.map((stage) => {
            const Icon = icons[stage.id];
            return (
              <Link
                key={stage.id}
                href={stage.href}
                title={stage.description}
                className={`group flex min-w-[94px] flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 transition ${stage.state === "current" ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200" : stage.state === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"}`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate text-[10px] font-semibold">{stage.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="surface-card mb-6 overflow-hidden p-5 md:p-6" aria-label="Learning journey">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Learning journey</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">Discover → Learn → Practice → Validate → Complete</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">One visible path from the business problem to confident Tractus-X adoption. Every stage opens a real part of the learning experience.</p>
        </div>
        <div className="min-w-[150px] text-right">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ready ? `${journey.completedCount}/4 gates cleared` : "Loading progress"}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{ready ? `${journey.percent}%` : "—"}</p>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-[width] duration-500" style={{ width: `${ready ? journey.percent : 0}%` }} />
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-5">
        {journey.stages.map((stage, index) => {
          const Icon = icons[stage.id];
          const current = stage.state === "current";
          const complete = stage.state === "complete";
          return (
            <Link
              key={stage.id}
              href={stage.href}
              className={`group relative rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${current ? "border-blue-200 bg-blue-50/80 dark:border-blue-400/30 dark:bg-blue-400/10" : complete ? "border-emerald-200 bg-emerald-50/75 dark:border-emerald-400/25 dark:bg-emerald-400/10" : "border-slate-200 bg-white hover:border-blue-200 dark:border-white/10 dark:bg-white/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${current ? "bg-blue-600 text-white" : complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}><Icon size={18} /></span>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{complete ? "Done" : current ? "You are here" : `Stage ${index + 1}`}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{stage.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{stage.description}</p>
              <span className="mt-3 inline-flex text-[10px] font-semibold text-blue-700 opacity-80 transition group-hover:translate-x-0.5 dark:text-blue-300">Open stage →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
