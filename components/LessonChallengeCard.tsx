"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  GripVertical,
  Lightbulb,
  Network,
  RotateCcw,
  Route,
  ShieldQuestion,
} from "lucide-react";
import {
  evaluateLessonChallenge,
  type LessonChallenge,
  type LessonChallengeKind,
  type LessonChallengeResult,
} from "@/lib/simulator";

const kindMeta: Record<LessonChallengeKind, { label: string; icon: typeof ShieldQuestion }> = {
  "multiple-choice": { label: "Quick check", icon: ShieldQuestion },
  "scenario-decision": { label: "Scenario decision", icon: Route },
  "component-select": { label: "Choose a component", icon: Boxes },
  "workflow-order": { label: "Order the workflow", icon: GripVertical },
  "architecture-select": { label: "Architecture challenge", icon: Network },
};

export function LessonChallengeCard({
  challenge,
  solved = false,
  onSolved,
}: {
  challenge: LessonChallenge;
  solved?: boolean;
  onSolved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<LessonChallengeResult | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const meta = kindMeta[challenge.kind];
  const TypeIcon = meta.icon;

  const availableOrderingItems = useMemo(() => {
    if (challenge.kind !== "workflow-order") return [];
    return challenge.items.filter((item) => !selected.includes(item.id));
  }, [challenge, selected]);

  function choose(id: string) {
    if (result?.correct) return;
    setResult(null);
    setHintVisible(false);
    if (challenge.kind === "workflow-order") {
      if (!selected.includes(id)) setSelected((current) => [...current, id]);
      return;
    }
    const multi = challenge.correctOptionIds.length > 1;
    setSelected((current) => {
      if (!multi) return [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  function checkAnswer() {
    if (selected.length === 0) return;
    const evaluation = evaluateLessonChallenge(challenge, selected);
    setResult(evaluation);
    if (evaluation.correct) onSolved();
  }

  function retry() {
    setSelected([]);
    setResult(null);
    setHintVisible(false);
  }

  function undoOrder() {
    setResult(null);
    setSelected((current) => current.slice(0, -1));
  }

  const isComplete = solved || result?.correct;

  return (
    <section id="practice" className="scroll-mt-28 rounded-[1.6rem] border border-blue-200 bg-blue-50/55 p-4 shadow-sm md:p-5 dark:border-blue-400/20 dark:bg-blue-400/[0.06]" aria-label="Lesson challenge">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
            <TypeIcon size={15} />
            <span>{meta.label}</span>
          </div>
          <h3 className="mt-2 max-w-2xl text-lg font-semibold leading-7 tracking-[-0.02em] text-slate-950 dark:text-white">{challenge.prompt}</h3>
        </div>
        {isComplete && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
            <CheckCircle2 size={13} /> Solved
          </span>
        )}
      </div>

      {challenge.kind === "workflow-order" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Available steps</p>
            <div className="mt-2 space-y-2">
              {availableOrderingItems.map((item) => (
                <button key={item.id} type="button" onClick={() => choose(item.id)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 active:scale-[.99] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <GripVertical size={15} className="text-slate-400" />
                  {item.label}
                </button>
              ))}
              {availableOrderingItems.length === 0 && <p className="py-3 text-xs text-slate-400">All steps placed. Check the order.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Your workflow</p>
              {selected.length > 0 && !isComplete && <button type="button" onClick={undoOrder} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300"><ChevronLeft size={12} /> Undo</button>}
            </div>
            <div className="mt-2 space-y-2">
              {selected.map((id, index) => {
                const item = challenge.items.find((candidate) => candidate.id === id);
                return (
                  <div key={`${id}-${index}`} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:border-blue-400/15 dark:bg-blue-400/[0.08] dark:text-slate-100">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">{index + 1}</span>
                    {item?.label}
                  </div>
                );
              })}
              {selected.length === 0 && <p className="py-3 text-xs text-slate-400">Choose the first milestone from the left.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {challenge.options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button key={option.id} type="button" onClick={() => choose(option.id)} disabled={isComplete} className={`rounded-2xl border p-3.5 text-left transition-all active:scale-[.99] disabled:cursor-default ${active ? "border-blue-400 bg-blue-100/80 shadow-sm dark:border-blue-400/50 dark:bg-blue-400/15" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5"}`}>
                <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">{option.label}</p>
                {active && result && !result.correct && <p className="mt-1.5 text-xs leading-5 text-rose-700 dark:text-rose-200">{option.explanation}</p>}
              </button>
            );
          })}
        </div>
      )}

      {!isComplete && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={checkAnswer} disabled={selected.length === 0} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Check answer</button>
          <button type="button" onClick={() => setHintVisible((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <Lightbulb size={14} /> {hintVisible ? "Hide hint" : "Give me a clue"}
          </button>
        </div>
      )}

      {hintVisible && !isComplete && (
        <div className="mt-3 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          <Lightbulb size={15} className="mt-0.5 shrink-0" />
          <span>{challenge.hint}</span>
        </div>
      )}

      {result && !result.correct && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 motion-safe:animate-[pulse_0.55s_ease-in-out_1] dark:border-rose-400/20 dark:bg-rose-400/[0.08]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-rose-700 dark:text-rose-200">Why this is wrong</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-700 dark:text-slate-200">{result.explanation}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Relevant concept: <span className="text-blue-700 dark:text-blue-300">{result.relevantConcept}</span></p>
              <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-white/5 dark:text-rose-200">
                <RotateCcw size={13} /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-200">Correct</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-700 dark:text-slate-200">{result?.explanation || challenge.correctExplanation}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">Key takeaway: {challenge.takeaway}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
