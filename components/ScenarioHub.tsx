"use client";

import Link from "next/link";
import { useMemo } from "react";
import { learningScenarios } from "@/data/catalog";
import { scenarioCompletionPercent } from "@/lib/progress";
import { useLearningProgress } from "@/components/useLearningProgress";

const audienceCards = [
  {
    title: "Manager",
    subtitle: "Understand the business value",
    detail: "Start with the problem, the actors and the decision. Technical terms appear only when they become useful.",
  },
  {
    title: "Architect",
    subtitle: "See how the pieces connect",
    detail: "Follow EDC, identity, policies, registries, semantics and application boundaries inside the same business story.",
  },
  {
    title: "Developer",
    subtitle: "Go down to technical behavior",
    detail: "Use the same scenario, then reveal protocol behavior, payload meaning and implementation-facing concepts.",
  },
] as const;

export function ScenarioHub() {
  const { progress, ready, clearProgress } = useLearningProgress();

  const overview = useMemo(() => {
    const rows = learningScenarios.map((scenario) => ({
      id: scenario.id,
      percent: scenarioCompletionPercent(progress, scenario.id, scenario.steps.length),
      solved: progress[scenario.id]?.solvedChallenges.length ?? 0,
      challenges: scenario.challenges.length,
    }));

    const average = rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length);
    const completed = rows.filter((row) => row.percent === 100).length;
    return { rows, average, completed };
  }, [progress]);

  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
          <div className="flex items-center gap-2">
            {ready && Object.keys(progress).length > 0 && (
              <button onClick={clearProgress} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40 hover:text-white/70">Reset local progress</button>
            )}
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Simulator v1</span>
          </div>
        </header>

        <section className="grid gap-8 py-14 md:py-20 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Choose a real business problem</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Do not learn Tractus-X component by component.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/58">
              Pick a scenario you already understand from business. TractusLab reveals the dataspace concepts only when the story needs them.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Local learning progress</span>
              <span>{ready ? `${overview.average}%` : "—"}</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${ready ? overview.average : 0}%` }} />
            </div>
            <p className="mt-4 text-sm text-white/52">{ready ? `${overview.completed} of ${learningScenarios.length} scenarios completed on this device.` : "Loading progress from this device…"}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {learningScenarios.map((scenario, index) => {
            const row = overview.rows.find((item) => item.id === scenario.id);
            const percent = ready ? row?.percent ?? 0 : 0;
            const solved = ready ? row?.solved ?? 0 : 0;

            return (
              <Link
                key={scenario.id}
                href={`/learn/${scenario.id}`}
                className="group rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.045] md:p-8"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Scenario {String(index + 1).padStart(2, "0")}</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] md:text-3xl">{scenario.shortTitle}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">{scenario.useCase}</span>
                </div>

                <p className="mt-5 max-w-2xl leading-7 text-white/55">{scenario.goal}</p>

                <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/38">
                  <span className="rounded-full bg-white/[0.05] px-3 py-1.5">{scenario.steps.length} learning steps</span>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1.5">{scenario.challenges.length} break & fix</span>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1.5">Asset: {scenario.asset}</span>
                </div>

                <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-center justify-between text-xs text-white/38">
                    <span>{percent === 100 ? "Learning complete" : percent > 0 ? "Continue learning" : "Not started"}</span>
                    <span>{percent}% · {solved}/{scenario.challenges.length} fixes</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-emerald-300" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className="mt-7 font-semibold text-emerald-300">{percent > 0 && percent < 100 ? "Continue simulation" : "Run this simulation"} <span className="inline-block transition group-hover:translate-x-1">→</span></div>
              </Link>
            );
          })}
        </section>

        <section className="mt-16 border-t border-white/10 pt-12">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Same scenario. Different depth.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {audienceCards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-lg font-semibold">{card.title}</p>
                <p className="mt-1 text-sm text-emerald-200/65">{card.subtitle}</p>
                <p className="mt-4 text-sm leading-6 text-white/45">{card.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
