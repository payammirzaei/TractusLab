"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowLeftRight, ArrowRight, BrainCircuit, Check, Minus, Sparkles, XCircle } from "lucide-react";
import type { FlowDirection, LearningDepth, ScenarioStep } from "@/lib/simulator";

const predictionOptions: Array<{ value: FlowDirection; label: string; hint: string; icon: typeof ArrowRight }> = [
  { value: "supplier-to-manufacturer", label: "Provider → Consumer", hint: "The data owner moves the story forward.", icon: ArrowRight },
  { value: "manufacturer-to-supplier", label: "Consumer → Provider", hint: "The data requester initiates the next move.", icon: ArrowLeft },
  { value: "both", label: "Two-way", hint: "Both participants must act together.", icon: ArrowLeftRight },
  { value: "internal", label: "Inside one side", hint: "This happens locally before the exchange continues.", icon: Minus },
];

type PredictionState = "idle" | "wrong" | "correct";

export function EventTimeline({
  steps,
  currentIndex,
  depth,
  simpleMode,
  onStepSelect,
}: {
  steps: ScenarioStep[];
  currentIndex: number;
  depth: LearningDepth;
  simpleMode: boolean;
  onStepSelect?: (index: number) => void;
}) {
  const completed = Math.min(currentIndex, steps.length);
  const [predictions, setPredictions] = useState<Record<string, FlowDirection>>({});
  const [states, setStates] = useState<Record<string, PredictionState>>({});
  const [showClues, setShowClues] = useState<Record<string, boolean>>({});

  const predictionStats = useMemo(() => {
    let attempted = 0;
    let correct = 0;
    for (const step of steps) {
      const prediction = predictions[step.id];
      if (!prediction) continue;
      attempted += 1;
      if (prediction === step.direction) correct += 1;
    }
    return { attempted, correct };
  }, [predictions, steps]);

  function makeStep(stepId: string, direction: FlowDirection) {
    const correctStep = steps.find((s) => s.id === stepId);
    const isCorrect = correctStep?.direction === direction;
    setPredictions((current) => ({ ...current, [stepId]: direction }));
    setStates((current) => ({ ...current, [stepId]: isCorrect ? "correct" : "wrong" }));
    if (!isCorrect) {
      setShowClues((current) => ({ ...current, [stepId]: false }));
    }
  }

  function revealClue(stepId: string) {
    setShowClues((current) => ({ ...current, [stepId]: true }));
  }

  function retryStep(stepId: string) {
    setPredictions((current) => {
      const next = { ...current };
      delete next[stepId];
      return next;
    });
    setStates((current) => ({ ...current, [stepId]: "idle" }));
    setShowClues((current) => ({ ...current, [stepId]: false }));
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,.28)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Exchange timeline</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">Predict the next move before the flow reveals it. Active recall beats passive reading.</p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
            {simpleMode ? "Plain-language flow" : depth === "developer" ? "Protocol-facing view" : "System flow"}
          </span>
          <p className="mt-2 text-[10px] text-slate-500">
            {completed}/{steps.length} events reached
            {predictionStats.attempted > 0 && ` · ${predictionStats.correct}/${predictionStats.attempted} predictions right`}
          </p>
        </div>
      </div>

      <div className="relative p-4 md:p-5">
        <div className="absolute bottom-5 left-[31px] top-5 w-px bg-slate-200" />
        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            const upcoming = index > currentIndex;
            const prediction = predictions[step.id];
            const state = states[step.id] || "idle";
            const showClue = showClues[step.id] || false;

            return (
              <div
                key={step.id}
                className={`relative grid grid-cols-[38px_1fr] gap-3 rounded-2xl p-2.5 transition-all duration-300 ${active ? "cursor-pointer bg-blue-50/80" : "cursor-pointer hover:bg-slate-50"}`}
                onClick={() => onStepSelect?.(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStepSelect?.(index);
                  }
                }}
                aria-label={`Step ${index + 1}: ${simpleMode ? step.question : step.technicalName}`}
              >
                <div className="relative z-10 flex justify-center pt-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${active ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_16px_rgba(37,99,235,.22)]" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}
                  >
                    {done ? "✓" : index + 1}
                  </div>
                </div>

                <div className={`rounded-xl border px-3.5 py-3 transition-all ${active ? "border-blue-100 bg-white shadow-[0_10px_28px_rgba(37,99,235,.05)]" : done ? "border-transparent" : "border-transparent opacity-70"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-600"}`}>{simpleMode ? step.question : step.technicalName}</p>
                        {active && state === "idle" && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">Your move</span>}
                        {active && state === "correct" && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Correct</span>}
                        {active && state === "wrong" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700">Wrong path</span>}
                      </div>
                      {active && state === "idle" && <p className="mt-1.5 text-xs leading-5 text-slate-600">{simpleMode ? "Look at the business story and guess what must happen next." : step.question}</p>}
                    </div>
                    {!simpleMode && state === "idle" && (
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${active ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>
                        {active ? "predict first" : directionLabel(step.direction)}
                      </span>
                    )}
                  </div>

                  {/* PREDICTION FLOW: Situation + Predict */}
                  {active && state === "idle" && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,.16)]">
                          <BrainCircuit size={16} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Situation: What happens next?</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-slate-600">Read the step and choose the responsibility that must move now.</p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {predictionOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                makeStep(step.id, option.value);
                              }}
                              className="group rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                                  <Icon size={14} strokeWidth={2} />
                                </span>
                                <span className="text-[11px] font-semibold text-slate-800">{option.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* WRONG: Dead-end animation with visual flow blocked */}
                  {active && state === "wrong" && prediction && (
                    <div className="mt-4 space-y-3">
                      {/* Visual dead-end: attempted flow → blocked */}
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-rose-600 animate-pulse`}>
                              <ArrowFlowIcon direction={prediction} />
                            </span>
                            <span className="text-lg text-rose-600">
                              <XCircle size={20} strokeWidth={2.5} />
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-[0.12em]">Exchange blocked</span>
                        </div>
                      </div>

                      {/* What broke explanation */}
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-rose-600">
                            <AlertTriangle size={16} strokeWidth={2.5} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-rose-900">What broke?</p>
                            <p className="mt-2 text-[11px] leading-5 text-rose-800">{step.withoutIt}</p>
                          </div>
                        </div>
                      </div>

                      {/* Try again / Give me a clue buttons */}
                      <div className="flex gap-2 sm:grid sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryStep(step.id);
                          }}
                          className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Try again
                        </button>
                        {!showClue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              revealClue(step.id);
                            }}
                            className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            Give me a clue
                          </button>
                        )}
                      </div>

                      {/* Clue: pattern without naming the correct direction */}
                      {showClue && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Clue: Pattern</p>
                          <p className="mt-2 text-xs leading-5 text-blue-900">{step.whyNeeded}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CORRECT: Direction revealed + Why it matters + Memory hook + Continue button */}
                  {active && state === "correct" && prediction && (
                    <div className="mt-4 space-y-3">
                      {/* Explicit correct direction reveal */}
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-emerald-600">
                            <Check size={16} strokeWidth={2.5} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-emerald-900">Correct flow</p>
                            <p className="mt-1 text-sm font-semibold text-emerald-800">{directionLabel(step.direction)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Why it matters: whyNeeded */}
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-emerald-600">
                            <Sparkles size={16} strokeWidth={2} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-emerald-900">Why it matters</p>
                            <p className="mt-2 text-[11px] leading-5 text-emerald-800">{step.whyNeeded}</p>
                          </div>
                        </div>
                      </div>

                      {/* Memory hook: concise pattern based on technicalName + direction */}
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">Memory hook</p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-amber-900">
                          {step.technicalName}: {directionLabel(step.direction)}
                        </p>
                      </div>

                      {/* Developer payload: shown after correct */}
                      {!simpleMode && depth === "developer" && step.payload && (
                        <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 font-mono text-[10px] leading-5 text-cyan-800">
                          <span className="mr-2 font-semibold text-cyan-600">EVENT</span>{step.payload}
                        </div>
                      )}

                      {/* Continue button to advance to next step */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepSelect?.(index + 1);
                        }}
                        className="w-full rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-bold text-slate-900 shadow-[0_8px_20px_rgba(16,185,129,.12)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
                      >
                        Continue to next step →
                      </button>
                    </div>
                  )}

                  {upcoming && <div className="mt-1 h-0.5 w-8 rounded-full bg-slate-200" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function directionLabel(direction: FlowDirection) {
  if (direction === "supplier-to-manufacturer") return "Provider → Consumer";
  if (direction === "manufacturer-to-supplier") return "Consumer → Provider";
  if (direction === "both") return "Two-way exchange";
  return "Internal";
}

function ArrowFlowIcon({ direction }: { direction: FlowDirection }) {
  switch (direction) {
    case "supplier-to-manufacturer":
      return <ArrowRight size={14} strokeWidth={2} />;
    case "manufacturer-to-supplier":
      return <ArrowLeft size={14} strokeWidth={2} />;
    case "both":
      return <ArrowLeftRight size={14} strokeWidth={2} />;
    default:
      return <Minus size={14} strokeWidth={2} />;
  }
}

