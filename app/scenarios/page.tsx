import Link from "next/link";
import { learningScenarios } from "@/data/catalog";

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
];

export default function ScenarioHubPage() {
  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Simulator v1</span>
        </header>

        <section className="py-14 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Choose a real business problem</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Do not learn Tractus-X component by component.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/58">
            Pick a scenario you already understand from business. TractusLab reveals the dataspace concepts only when the story needs them.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {learningScenarios.map((scenario, index) => (
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
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5">{scenario.challenges.length} break & fix challenges</span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5">Asset: {scenario.asset}</span>
              </div>

              <div className="mt-7 font-semibold text-emerald-300">Run this simulation <span className="inline-block transition group-hover:translate-x-1">→</span></div>
            </Link>
          ))}
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
