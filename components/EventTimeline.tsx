"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, BrainCircuit, Check, ChevronRight, Minus, Sparkles, X } from "lucide-react";
import type { FlowDirection, LearningDepth, ScenarioStep } from "@/lib/simulator";

const predictionOptions: Array<{ value: FlowDirection; label: string; hint: string; icon: typeof ArrowRight }> = [
  { value: "supplier-to-manufacturer", label: "Provider → Consumer", hint: "The data owner moves the story forward.", icon: ArrowRight },
  { value: "manufacturer-to-supplier", label: "Consumer → Provider", hint: "The data requester initiates the next move.", icon: ArrowLeft },
  { value: "both", label: "Two-way", hint: "Both participants must act together.", icon: ArrowLeftRight },
  { value: "internal", label: "Inside one side", hint: "This happens locally before the exchange continues.", icon: Minus },
];

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
            const predictionMade = Boolean(prediction);
            const predictionCorrect = prediction === step.direction;
            const isClickable = !active && onStepSelect;

            return (
              <div
                key={step.id}
                className={`relative grid grid-cols-[38px_1fr] gap-3 rounded-2xl p-2.5 transition-all duration-300 ${active ? "bg-blue-50/80" : "hover:bg-slate-50"}`}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-label={isClickable ? `Open step ${index + 1}: ${simpleMode ? step.question : step.technicalName}` : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onStepSelect?.(index);
                  }
                }}
                onClick={() => {
                  if (isClickable) {
                    onStepSelect?.(index);
                  }
                }}
                style={isClickable ? { cursor: "pointer" } : undefined}
              >
                <div className="relative z-10 flex justify-center pt-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${active ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_16px_rgba(37,99,235,.22)]" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                    {done ? "✓" : index + 1}
                  </div>
                </div>

                <div className={`rounded-xl border px-3.5 py-3 transition-all ${active ? "border-blue-100 bg-white shadow-[0_10px_28px_rgba(37,99,235,.05)]" : done ? "border-transparent" : "border-transparent opacity-70"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-600"}`}>{simpleMode ? step.question : step.technicalName}</p>
                        {active && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">Your move</span>}
                      </div>
                      {active && <p className="mt-1.5 text-xs leading-5 text-slate-600">{simpleMode ? "Look at the business story and guess what must happen next." : step.question}</p>}
                    </div>
                    {!simpleMode && (
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${active && !predictionMade ? "bg-slate-100 text-slate-500" : active ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>
                        {active && !predictionMade ? "predict first" : directionLabel(step.direction)}
                      </span>
                    )}
                    {isClickable && (
                      <ChevronRight className="ml-auto mt-0.5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" />
                    )}
                  </div>

                  {active && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,.16)]">
                          <BrainCircuit size={16} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Predict the next move</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-slate-600">Don't memorize the architecture. Read the situation and choose the responsibility that should move now.</p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {predictionOptions.map((option) => {
                          const Icon = option.icon;
                          const selected = prediction === option.value;
                          const isCorrectOption = predictionMade && option.value === step.direction;
                          const wrongSelected = selected && !predictionCorrect;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setPredictions((current) => ({ ...current, [step.id]: option.value }))}
                              className={`group rounded-xl border p-2.5 text-left transition-all ${
                                isCorrectOption
                                  ? "border-emerald-300 bg-emerald-50 shadow-[0_6px_16px_rgba(16,185,129,.07)]"
                                  : wrongSelected
                                    ? "border-rose-200 bg-rose-50"
                                    : selected
                                      ? "border-blue-300 bg-blue-50"
                                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isCorrectOption ? "bg-emerald-100 text-emerald-700" : wrongSelected ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700"}`}>
                                  {isCorrectOption ? <Check size={14} strokeWidth={2.5} /> : wrongSelected ? <X size={14} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={2} />}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-800">{option.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {predictionMade && (
                        <div className={`mt-3 flex gap-2.5 rounded-xl border p-3 ${predictionCorrect ? "border-emerald-200 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}>
                          <Sparkles className={predictionCorrect ? "mt-0.5 text-emerald-600" : "mt-0.5 text-blue-600"} size={15} strokeWidth={2} aria-hidden="true" />
                          <div>
                            <p className={`text-[11px] font-bold ${predictionCorrect ? "text-emerald-800" : "text-blue-800"}`}>{predictionCorrect ? "Exactly — now the flow makes sense." : "Good attempt — update the mental model."}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-600">{directionFeedback(step.direction)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {active && predictionMade && !simpleMode && depth === "developer" && step.payload && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 font-mono text-[10px] leading-5 text-blue-800">
                      <span className="mr-2 font-semibold text-blue-500">EVENT</span>{step.payload}
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

function directionLabel(direction: ScenarioStep["direction"]) {
  if (direction === "supplier-to-manufacturer") return "provider → consumer";
  if (direction === "manufacturer-to-supplier") return "consumer → provider";
  if (direction === "both") return "two-way";
  return "internal";
}

function directionFeedback(direction: ScenarioStep["direction"]) {
  if (direction === "supplier-to-manufacturer") return "The provider now has what it needs to send or expose something toward the consumer.";
  if (direction === "manufacturer-to-supplier") return "The consumer must initiate this part of the story before the provider can respond.";
  if (direction === "both") return "This responsibility only works when both participants establish the same shared state.";
  return "Nothing needs to cross the dataspace yet; this responsibility is completed inside one participant first.";
}
