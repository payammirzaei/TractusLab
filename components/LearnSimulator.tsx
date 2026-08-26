"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataspaceMap } from "@/components/DataspaceMap";
import { DepthSwitcher } from "@/components/DepthSwitcher";
import { Glossary } from "@/components/Glossary";
import { getScenarioById, learningScenarios } from "@/data/catalog";
import {
  evaluateChallenge,
  isScenarioComplete,
  nextStepIndex,
  previousStepIndex,
  progressPercent,
  type LearningDepth,
} from "@/lib/simulator";

type Mode = "learn" | "challenge";

export function LearnSimulator({ initialScenarioId }: { initialScenarioId?: string }) {
  const initialScenario = getScenarioById(initialScenarioId);
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [depth, setDepth] = useState<LearningDepth>("business");
  const [mode, setMode] = useState<Mode>("learn");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const complete = isScenarioComplete(stepIndex, scenario.steps.length);
  const step = scenario.steps[Math.min(stepIndex, scenario.steps.length - 1)];
  const progress = progressPercent(stepIndex, scenario.steps.length);
  const challenge = scenario.challenges[Math.min(challengeIndex, scenario.challenges.length - 1)];
  const challengeResult = selectedOption && challenge ? evaluateChallenge(challenge, selectedOption) : null;

  function resetScenario(nextScenarioId = scenario.id) {
    setScenarioId(nextScenarioId);
    setStepIndex(0);
    setMode("learn");
    setChallengeIndex(0);
    setSelectedOption(null);
    setShowHint(false);
  }

  function startChallenges() {
    if (scenario.challenges.length === 0) return;
    setMode("challenge");
    setChallengeIndex(0);
    setSelectedOption(null);
    setShowHint(false);
  }

  function nextChallenge() {
    if (challengeIndex >= scenario.challenges.length - 1) {
      resetScenario();
      return;
    }
    setChallengeIndex((value) => value + 1);
    setSelectedOption(null);
    setShowHint(false);
  }

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
            <Link href="/scenarios" className="text-xs text-white/40 hover:text-white/70">Scenario hub</Link>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {learningScenarios.map((item) => (
              <button
                key={item.id}
                onClick={() => resetScenario(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  item.id === scenario.id
                    ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100"
                    : "border-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                {item.shortTitle}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/38">
                <span>{scenario.useCase}</span>
                <span>•</span>
                <span>{scenario.asset}</span>
                <span>•</span>
                <span>{mode === "learn" ? `${progress}% complete` : `Challenge ${challengeIndex + 1}/${scenario.challenges.length}`}</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em] md:text-5xl">{scenario.title}</h1>
              <p className="mt-3 max-w-3xl leading-7 text-white/55">{scenario.goal}</p>
            </div>
            <DepthSwitcher value={depth} onChange={setDepth} />
          </div>

          <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-emerald-300 transition-all duration-500" style={{ width: `${mode === "learn" ? progress : 100}%` }} />
          </div>
        </section>

        {mode === "learn" ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-6">
              <DataspaceMap focus={complete ? ["supplier", "dataspace", "manufacturer"] : step.mapFocus} direction={complete ? "both" : step.direction} />
              <div className="grid gap-3 sm:grid-cols-2">
                <CompanyCard icon="🏭" title={scenario.supplierLabel} subtitle="Owns and offers data" />
                <CompanyCard icon="🚗" title={scenario.manufacturerLabel} subtitle="Discovers and requests data" />
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-[#0b1714] p-5 md:p-7">
              {complete ? (
                <CompletionCard
                  scenarioTitle={scenario.shortTitle}
                  onRestart={() => resetScenario()}
                  onChallenge={startChallenges}
                  hasChallenges={scenario.challenges.length > 0}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Step {stepIndex + 1} / {scenario.steps.length}</p>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">{step.technicalName}</span>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em]">{step.question}</h2>

                  <div className="mt-5 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.055] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/55">{depthLabel(depth)}</p>
                    <p className="mt-2 leading-7 text-white/76">{step[depth]}</p>
                  </div>

                  {step.payload && (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-white/55">{step.payload}</div>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <details className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-white/70">Why is this needed?</summary>
                      <p className="mt-3 text-sm leading-6 text-white/48">{step.whyNeeded}</p>
                    </details>
                    <details className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-white/70">What if we skip it?</summary>
                      <p className="mt-3 text-sm leading-6 text-white/48">{step.withoutIt}</p>
                    </details>
                  </div>

                  <div className="mt-3"><Glossary terms={step.glossary} /></div>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setStepIndex((value) => previousStepIndex(value))}
                      disabled={stepIndex === 0}
                      className="rounded-full border border-white/12 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStepIndex((value) => nextStepIndex(value, scenario.steps.length))}
                      className="rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-[#07110f] transition hover:translate-y-[-1px]"
                    >
                      {step.actionLabel} →
                    </button>
                  </div>
                </>
              )}
            </aside>
          </section>
        ) : challenge ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <DataspaceMap focus={["supplier-edc", "dataspace", "consumer-edc"]} direction="both" />
            <aside className="rounded-[2rem] border border-amber-300/20 bg-[#17150b] p-5 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Break & Fix</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{challenge.title}</h2>
              <p className="mt-4 leading-7 text-white/62">{challenge.prompt}</p>
              <div className="mt-5 rounded-2xl border border-amber-200/10 bg-black/20 p-4 font-mono text-sm text-amber-100/70">{challenge.symptom}</div>

              <div className="mt-5 space-y-3">
                {challenge.options.map((option) => {
                  const selected = selectedOption === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? challengeResult?.correct
                            ? "border-emerald-300/45 bg-emerald-300/10"
                            : "border-rose-300/40 bg-rose-300/[0.08]"
                          : "border-white/10 bg-black/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{option.label}</span>
                        {selected && <span>{challengeResult?.correct ? "✓" : "×"}</span>}
                      </div>
                      {selected && <p className="mt-2 text-sm leading-6 text-white/50">{option.explanation}</p>}
                    </button>
                  );
                })}
              </div>

              {!challengeResult?.correct && (
                <button onClick={() => setShowHint(true)} className="mt-4 text-sm text-amber-200/65 underline decoration-amber-200/20 underline-offset-4">Give me a hint</button>
              )}
              {showHint && !challengeResult?.correct && (
                <p className="mt-3 rounded-2xl bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/65">💡 {challenge.hint}</p>
              )}

              {challengeResult?.correct && (
                <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                  <p className="text-sm font-semibold text-emerald-200">Root cause found</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">{challenge.rootCause}</p>
                  <button onClick={nextChallenge} className="mt-4 rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">
                    {challengeIndex === scenario.challenges.length - 1 ? "Finish challenges" : "Next challenge"} →
                  </button>
                </div>
              )}
            </aside>
          </section>
        ) : null}

        {mode === "learn" && !complete && (
          <section className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {scenario.steps.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setStepIndex(index)}
                className={`rounded-2xl border p-3 text-left text-xs transition ${
                  index < stepIndex
                    ? "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100/75"
                    : index === stepIndex
                      ? "border-white/25 bg-white/[0.055] text-white"
                      : "border-white/8 text-white/30"
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-50">{index + 1}</span>
                <span className="mt-1 block font-medium">{item.technicalName}</span>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function depthLabel(depth: LearningDepth) {
  if (depth === "business") return "Manager view — business meaning";
  if (depth === "architecture") return "Architect view — system relationship";
  return "Developer view — technical behavior";
}

function CompanyCard({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-white/38">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function CompletionCard({
  scenarioTitle,
  onRestart,
  onChallenge,
  hasChallenges,
}: {
  scenarioTitle: string;
  onRestart: () => void;
  onChallenge: () => void;
  hasChallenges: boolean;
}) {
  return (
    <div className="flex min-h-[560px] flex-col justify-center">
      <div className="text-5xl">✓</div>
      <p className="mt-5 text-sm font-semibold text-emerald-300">Learning flow complete</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">You can now explain the {scenarioTitle} flow without starting from acronyms.</h2>
      <p className="mt-5 leading-7 text-white/58">Next, diagnose a broken simulated flow. That is where the concepts become operational knowledge.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        {hasChallenges && <button onClick={onChallenge} className="rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-[#171207]">Start Break & Fix →</button>}
        <button onClick={onRestart} className="rounded-full border border-white/12 px-6 py-2.5 text-sm text-white/70">Run again</button>
      </div>
    </div>
  );
}
