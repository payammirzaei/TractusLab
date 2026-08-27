"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataspaceMap } from "@/components/DataspaceMap";
import { DepthSwitcher } from "@/components/DepthSwitcher";
import { EventTimeline } from "@/components/EventTimeline";
import { Glossary } from "@/components/Glossary";
import { LearnerNav } from "@/components/LearnerNav";
import { useBossScores } from "@/components/useBossScores";
import { useLearningProgress } from "@/components/useLearningProgress";
import { getScenarioById, learningScenarios } from "@/data/catalog";
import { calculateBossFightScore, newcomerExplanation, type BossFightResult } from "@/lib/boss";
import {
  evaluateChallenge,
  isScenarioComplete,
  nextStepIndex,
  previousStepIndex,
  progressPercent,
  type LearningDepth,
} from "@/lib/simulator";

type Mode = "learn" | "challenge" | "results";

export function LearnSimulatorV2({ initialScenarioId }: { initialScenarioId?: string }) {
  const initialScenario = getScenarioById(initialScenarioId);
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [depth, setDepth] = useState<LearningDepth>("business");
  const [simpleMode, setSimpleMode] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptedWrongOptions, setAttemptedWrongOptions] = useState<string[]>([]);
  const [bossResult, setBossResult] = useState<BossFightResult | null>(null);
  const [restoredScenarioId, setRestoredScenarioId] = useState<string | null>(null);

  const { progress: savedProgress, ready: progressReady, recordStep, solveChallenge } = useLearningProgress();
  const { scores: bossScores, ready: bossScoresReady, recordBestScore } = useBossScores();

  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const complete = isScenarioComplete(stepIndex, scenario.steps.length);
  const step = scenario.steps[Math.min(stepIndex, scenario.steps.length - 1)];
  const progress = progressPercent(stepIndex, scenario.steps.length);
  const challenge = scenario.challenges[Math.min(challengeIndex, scenario.challenges.length - 1)];
  const challengeResult = selectedOption && challenge ? evaluateChallenge(challenge, selectedOption) : null;
  const persistedScenario = savedProgress[scenario.id];
  const bestBossScore = bossScores[scenario.id];
  const liveBossScore = calculateBossFightScore(wrongAttempts, hintsUsed);

  useEffect(() => {
    if (!progressReady || restoredScenarioId === scenario.id) return;
    const saved = savedProgress[scenario.id];
    if (saved && !saved.completed && saved.maxStep > 0) {
      setStepIndex(Math.min(saved.maxStep, Math.max(scenario.steps.length - 1, 0)));
    }
    setRestoredScenarioId(scenario.id);
  }, [progressReady, restoredScenarioId, savedProgress, scenario.id, scenario.steps.length]);

  useEffect(() => {
    if (!progressReady || mode !== "learn") return;
    recordStep(scenario.id, stepIndex, scenario.steps.length);
  }, [mode, progressReady, recordStep, scenario.id, scenario.steps.length, stepIndex]);

  function resetChallengeState() {
    setSelectedOption(null);
    setShowHint(false);
    setAttemptedWrongOptions([]);
  }

  function resetScenario(nextScenarioId = scenario.id) {
    setScenarioId(nextScenarioId);
    setStepIndex(0);
    setMode("learn");
    setChallengeIndex(0);
    setWrongAttempts(0);
    setHintsUsed(0);
    setBossResult(null);
    resetChallengeState();
    setRestoredScenarioId(null);
  }

  function startBossFight() {
    if (scenario.challenges.length === 0) return;
    setMode("challenge");
    setChallengeIndex(0);
    setWrongAttempts(0);
    setHintsUsed(0);
    setBossResult(null);
    resetChallengeState();
  }

  function chooseChallengeOption(optionId: string) {
    setSelectedOption(optionId);
    if (!challenge) return;
    const result = evaluateChallenge(challenge, optionId);
    if (result.correct) {
      solveChallenge(scenario.id, challenge.id);
      return;
    }
    if (!attemptedWrongOptions.includes(optionId)) {
      setAttemptedWrongOptions((current) => [...current, optionId]);
      setWrongAttempts((value) => value + 1);
    }
  }

  function revealHint() {
    if (!showHint) setHintsUsed((value) => value + 1);
    setShowHint(true);
  }

  function nextChallenge() {
    if (challengeIndex >= scenario.challenges.length - 1) {
      const result = calculateBossFightScore(wrongAttempts, hintsUsed);
      setBossResult(result);
      recordBestScore(scenario.id, result.score);
      setMode("results");
      return;
    }
    setChallengeIndex((value) => value + 1);
    resetChallengeState();
  }

  const modeLabel = mode === "learn" ? complete ? "Learning complete" : `Step ${stepIndex + 1} of ${scenario.steps.length}` : mode === "challenge" ? `Boss Fight ${challengeIndex + 1} of ${scenario.challenges.length}` : "Boss Fight result";
  const modeColor = mode === "challenge" ? "amber" : mode === "results" ? "cyan" : "emerald";

  return (
    <main className="min-h-screen pb-16">
      <LearnerNav active="learn" eyebrow="Interactive simulator" />
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="py-4 md:py-5">
          <div className="flex items-center gap-2 md:hidden">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Choose scenario</span>
              <select value={scenario.id} onChange={(event) => resetScenario(event.target.value)} className="w-full appearance-none rounded-xl border border-white/9 bg-[#0a1512] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-300/25">
                {learningScenarios.map((item) => <option key={item.id} value={item.id}>{item.shortTitle} · {item.useCase}</option>)}
              </select>
            </label>
            <Link href="/scenarios" className="button-ghost shrink-0">Browse</Link>
          </div>

          <div className="no-scrollbar hidden gap-1 overflow-x-auto rounded-2xl border border-white/[0.065] bg-black/15 p-1.5 md:flex">
            {learningScenarios.map((item) => (
              <button key={item.id} onClick={() => resetScenario(item.id)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${item.id === scenario.id ? "bg-white/10 text-white shadow-sm" : "text-white/34 hover:bg-white/[0.035] hover:text-white/68"}`}>
                {item.shortTitle}
              </button>
            ))}
            <Link href="/scenarios" className="ml-auto shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-200/55 transition hover:bg-emerald-300/[0.05] hover:text-emerald-100">Browse all →</Link>
          </div>
        </section>

        <section className="surface-hero relative overflow-hidden p-5 md:p-7">
          <div className={`absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl ${modeColor === "amber" ? "bg-amber-300/[0.055]" : modeColor === "cyan" ? "bg-cyan-300/[0.055]" : "bg-emerald-300/[0.055]"}`} />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">
                <span className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1">{scenario.useCase}</span>
                <span className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1">{scenario.asset}</span>
                <span className={`rounded-full border px-2.5 py-1 ${modeColor === "amber" ? "border-amber-300/15 text-amber-100/60" : modeColor === "cyan" ? "border-cyan-300/15 text-cyan-100/60" : "border-emerald-300/15 text-emerald-100/60"}`}>{modeLabel}</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-5xl">{scenario.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/46 md:text-base">{scenario.goal}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/28">
                {progressReady && persistedScenario && <span>{persistedScenario.solvedChallenges.length}/{scenario.challenges.length} diagnostic fixes saved</span>}
                {bossScoresReady && bestBossScore !== undefined && <span>Best Boss score {bestBossScore}/100</span>}
              </div>
            </div>

            <div className="space-y-3">
              {mode === "learn" && (
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] xl:grid-cols-1">
                  <button onClick={() => setSimpleMode((value) => !value)} className={`rounded-2xl border px-4 py-3 text-left transition ${simpleMode ? "border-sky-300/24 bg-sky-300/[0.07] text-sky-100" : "border-white/8 bg-black/15 text-white/45 hover:border-white/14 hover:text-white/70"}`}>
                    <span className="block text-xs font-semibold">{simpleMode ? "✓ Beginner-friendly language on" : "New to dataspaces?"}</span>
                    <span className={`mt-0.5 block text-[10px] ${simpleMode ? "text-sky-100/45" : "text-white/25"}`}>{simpleMode ? "Technical jargon is hidden." : "Switch to plain-English explanations."}</span>
                  </button>
                  {!simpleMode && <DepthSwitcher value={depth} onChange={setDepth} />}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.13em] text-white/25"><span>{mode === "learn" ? "Learning progress" : mode === "challenge" ? "Diagnostic run" : "Completed"}</span><span>{mode === "learn" ? `${progress}%` : "100%"}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className={`h-full rounded-full transition-all duration-500 ${modeColor === "amber" ? "bg-amber-300" : modeColor === "cyan" ? "bg-cyan-300" : "bg-emerald-300"}`} style={{ width: `${mode === "learn" ? progress : 100}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {mode === "learn" ? (
          <>
            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(410px,.92fr)] xl:items-start">
              <div className="hidden space-y-5 xl:block">
                {simpleMode ? <SimpleStoryMap supplier={scenario.supplierLabel} manufacturer={scenario.manufacturerLabel} /> : <DataspaceMap focus={complete ? ["supplier", "dataspace", "manufacturer"] : step.mapFocus} direction={complete ? "both" : step.direction} />}
                <EventTimeline steps={scenario.steps} currentIndex={complete ? scenario.steps.length : stepIndex} depth={depth} simpleMode={simpleMode} onStepSelect={setStepIndex} />
              </div>

              <aside className="surface-card p-5 md:p-6 xl:sticky xl:top-24">
                {complete ? (
                  <CompletionCard scenarioTitle={scenario.shortTitle} onRestart={() => resetScenario()} onBossFight={startBossFight} hasChallenges={scenario.challenges.length > 0} bestScore={bestBossScore} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="eyebrow">Now · Step {stepIndex + 1}</p><p className="mt-1 text-[11px] text-white/25">{simpleMode ? "Plain-English mode" : depthLabel(depth)}</p></div>
                      <span className="max-w-[45%] truncate rounded-xl border border-white/8 bg-black/15 px-2.5 py-1.5 text-[10px] font-semibold text-white/38">{simpleMode ? "No jargon" : step.technicalName}</span>
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold leading-[1.18] tracking-[-0.035em] md:text-3xl">{step.question}</h2>

                    <div className={`mt-5 rounded-2xl border p-4 md:p-5 ${simpleMode ? "border-sky-300/13 bg-sky-300/[0.045]" : "border-emerald-300/13 bg-emerald-300/[0.045]"}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${simpleMode ? "text-sky-200/50" : "text-emerald-200/50"}`}>{simpleMode ? "What this means" : "Explanation"}</p>
                      <p className="mt-2 text-sm leading-7 text-white/68 md:text-base">{simpleMode ? newcomerExplanation(step) : step[depth]}</p>
                    </div>

                    {!simpleMode && depth === "developer" && step.payload && <div className="mt-3 overflow-x-auto rounded-2xl border border-cyan-300/9 bg-black/22 px-4 py-3 font-mono text-[11px] leading-6 text-cyan-100/52">{step.payload}</div>}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <details className="rounded-2xl border border-white/8 bg-black/12 p-3.5 open:bg-white/[0.02]"><summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white/58"><span>Why is this needed?</span><span className="text-white/22">+</span></summary><p className="mt-3 text-xs leading-6 text-white/38">{step.whyNeeded}</p></details>
                      <details className="rounded-2xl border border-white/8 bg-black/12 p-3.5 open:bg-white/[0.02]"><summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white/58"><span>What breaks without it?</span><span className="text-white/22">+</span></summary><p className="mt-3 text-xs leading-6 text-white/38">{step.withoutIt}</p></details>
                    </div>

                    {!simpleMode && <div className="mt-3"><Glossary terms={step.glossary} /></div>}

                    <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
                      <button onClick={() => setStepIndex((value) => previousStepIndex(value))} disabled={stepIndex === 0} className="rounded-xl border border-white/9 px-4 py-3 text-sm font-semibold text-white/45 transition hover:border-white/15 hover:text-white/72 disabled:cursor-not-allowed disabled:opacity-25">← Back</button>
                      <button onClick={() => setStepIndex((value) => nextStepIndex(value, scenario.steps.length))} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-[#07110f] shadow-[0_12px_30px_rgba(110,231,183,.1)] transition hover:-translate-y-0.5 hover:bg-emerald-200">{simpleMode ? "Continue" : step.actionLabel} →</button>
                    </div>
                  </>
                )}
              </aside>

              <details className="surface-card overflow-hidden xl:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 text-sm font-semibold text-white/62"><span><span className="mr-2 text-cyan-300">◇</span>Open visual workspace</span><span className="text-xs font-normal text-white/28">Map + timeline</span></summary>
                <div className="space-y-4 border-t border-white/7 p-3 md:p-4">
                  {simpleMode ? <SimpleStoryMap supplier={scenario.supplierLabel} manufacturer={scenario.manufacturerLabel} /> : <DataspaceMap focus={complete ? ["supplier", "dataspace", "manufacturer"] : step.mapFocus} direction={complete ? "both" : step.direction} />}
                  <EventTimeline steps={scenario.steps} currentIndex={complete ? scenario.steps.length : stepIndex} depth={depth} simpleMode={simpleMode} onStepSelect={setStepIndex} />
                </div>
              </details>
            </section>

            {!complete && (
              <section className="mt-4">
                <div className="mb-2 flex items-center justify-between px-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Jump to a step</p><span className="text-[10px] text-white/20">Tap any completed or upcoming concept</span></div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {scenario.steps.map((item, index) => (
                    <button key={item.id} onClick={() => setStepIndex(index)} className={`min-w-[150px] shrink-0 rounded-2xl border p-3 text-left transition md:min-w-[175px] ${index < stepIndex ? "border-emerald-300/15 bg-emerald-300/[0.035] text-emerald-100/62" : index === stepIndex ? "border-white/18 bg-white/[0.045] text-white shadow-[0_12px_36px_rgba(0,0,0,.1)]" : "border-white/7 bg-black/10 text-white/27 hover:border-white/12"}`}>
                      <span className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] opacity-55"><span>Step {index + 1}</span><span>{index < stepIndex ? "✓" : index === stepIndex ? "Now" : ""}</span></span>
                      <span className="mt-1.5 block text-xs font-semibold leading-5">{simpleMode ? item.question : item.technicalName}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : mode === "challenge" && challenge ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[.78fr_1.22fr] xl:items-start">
            <div className="hidden space-y-5 xl:block xl:sticky xl:top-24"><DataspaceMap focus={["supplier-edc", "dataspace", "consumer-edc"]} direction="both" /><BossScoreCard score={liveBossScore.score} wrongAttempts={wrongAttempts} hintsUsed={hintsUsed} /></div>
            <aside className="rounded-[1.75rem] border border-amber-300/14 bg-gradient-to-b from-amber-300/[0.035] to-white/[0.015] p-5 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Boss Fight · Diagnose first</p><span className="rounded-xl border border-amber-300/12 bg-black/15 px-2.5 py-1 text-[10px] text-amber-100/50">Live score {liveBossScore.score}/100</span></div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em]">{challenge.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50 md:text-base">{challenge.prompt}</p>
              <div className="mt-5 rounded-2xl border border-amber-200/9 bg-black/22 p-4 font-mono text-xs leading-6 text-amber-100/62 md:text-sm">{challenge.symptom}</div>

              <div className="mt-5 space-y-2.5">
                {challenge.options.map((option) => {
                  const selected = selectedOption === option.id;
                  return (
                    <button key={option.id} onClick={() => chooseChallengeOption(option.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? challengeResult?.correct ? "border-emerald-300/35 bg-emerald-300/[0.075]" : "border-rose-300/28 bg-rose-300/[0.055]" : "border-white/8 bg-black/10 hover:border-white/15 hover:bg-white/[0.025]"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold md:text-base">{option.label}</span>{selected && <span className={challengeResult?.correct ? "text-emerald-300" : "text-rose-300"}>{challengeResult?.correct ? "✓" : "×"}</span>}</div>
                      {selected && <p className="mt-2 text-xs leading-6 text-white/42 md:text-sm">{option.explanation}</p>}
                    </button>
                  );
                })}
              </div>

              {!challengeResult?.correct && <button onClick={revealHint} className="mt-4 rounded-xl border border-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200/58 transition hover:bg-amber-300/[0.04] hover:text-amber-100">Reveal hint · −18 points</button>}
              {showHint && !challengeResult?.correct && <p className="mt-3 rounded-2xl border border-amber-300/9 bg-amber-300/[0.045] p-4 text-sm leading-6 text-amber-100/58">Hint: {challenge.hint}</p>}

              {challengeResult?.correct && <div className="mt-5 rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.055] p-4"><p className="text-sm font-semibold text-emerald-200">Root cause found ✓</p><p className="mt-2 text-sm leading-6 text-white/48">{challenge.rootCause}</p><button onClick={nextChallenge} className="mt-4 rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-bold text-[#07110f]">{challengeIndex === scenario.challenges.length - 1 ? "See result" : "Next failure"} →</button></div>}

              <details className="mt-4 rounded-2xl border border-white/7 bg-black/10 p-3 xl:hidden"><summary className="cursor-pointer text-xs font-semibold text-white/42">Open map & score details</summary><div className="mt-3 space-y-3"><DataspaceMap focus={["supplier-edc", "dataspace", "consumer-edc"]} direction="both" /><BossScoreCard score={liveBossScore.score} wrongAttempts={wrongAttempts} hintsUsed={hintsUsed} /></div></details>
            </aside>
          </section>
        ) : mode === "results" && bossResult ? (
          <BossResultCard result={bossResult} bestScore={Math.max(bestBossScore ?? 0, bossResult.score)} onRetry={startBossFight} onLearn={() => setMode("learn")} />
        ) : null}
      </div>
    </main>
  );
}

function depthLabel(depth: LearningDepth) {
  if (depth === "business") return "Manager · business meaning";
  if (depth === "architecture") return "Architect · system relationships";
  return "Developer · technical behavior";
}

function SimpleStoryMap({ supplier, manufacturer }: { supplier: string; manufacturer: string }) {
  return (
    <div className="surface-card p-4 md:p-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow !text-sky-300">Simple story</p><p className="mt-1 text-xs text-white/28">One trusted exchange, without protocol vocabulary.</p></div><span className="rounded-xl border border-sky-300/12 bg-sky-300/[0.04] px-2.5 py-1 text-[10px] text-sky-100/50">Beginner view</span></div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        <div className="rounded-2xl border border-white/8 bg-black/15 p-3 text-center md:p-4"><div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-lg">P</div><p className="mt-2 truncate text-xs font-semibold md:text-sm">{supplier}</p><p className="mt-1 text-[10px] text-white/28">Has useful data</p></div>
        <div className="text-center"><p className="hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-white/24 sm:block">trusted exchange</p><p className="mt-1 text-2xl text-sky-300 md:text-3xl">↔</p></div>
        <div className="rounded-2xl border border-white/8 bg-black/15 p-3 text-center md:p-4"><div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-lg">C</div><p className="mt-2 truncate text-xs font-semibold md:text-sm">{manufacturer}</p><p className="mt-1 text-[10px] text-white/28">Needs the data</p></div>
      </div>
    </div>
  );
}

function BossScoreCard({ score, wrongAttempts, hintsUsed }: { score: number; wrongAttempts: number; hintsUsed: number }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-end justify-between gap-4"><div><p className="eyebrow !text-amber-300">Live score</p><p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{score}<span className="text-base text-white/24">/100</span></p></div><p className="text-right text-[10px] leading-5 text-white/27">Wrong answer −12<br />Hint −18</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-white/6 bg-black/12 p-3"><span className="text-white/28">Wrong attempts</span><p className="mt-1 text-lg font-semibold">{wrongAttempts}</p></div><div className="rounded-xl border border-white/6 bg-black/12 p-3"><span className="text-white/28">Hints used</span><p className="mt-1 text-lg font-semibold">{hintsUsed}</p></div></div>
    </div>
  );
}

function CompletionCard({ scenarioTitle, onRestart, onBossFight, hasChallenges, bestScore }: { scenarioTitle: string; onRestart: () => void; onBossFight: () => void; hasChallenges: boolean; bestScore?: number }) {
  return (
    <div className="flex min-h-[390px] flex-col justify-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-300 text-xl font-black text-[#07110f] shadow-[0_16px_40px_rgba(110,231,183,.12)]">✓</div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-300">Learning flow complete</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em]">You can explain the {scenarioTitle} flow. Now prove you can diagnose it.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">Boss Fights turn the happy-path model into troubleshooting skill. Wrong guesses and hints reduce the score.</p>
      {bestScore !== undefined && <p className="mt-4 text-xs font-semibold text-cyan-200/58">Personal best: {bestScore}/100</p>}
      <div className="mt-7 flex flex-wrap gap-2">{hasChallenges && <button onClick={onBossFight} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#171207]">Start Boss Fight →</button>}<button onClick={onRestart} className="rounded-xl border border-white/9 px-5 py-3 text-sm font-semibold text-white/52 transition hover:text-white/75">Run again</button></div>
    </div>
  );
}

function BossResultCard({ result, bestScore, onRetry, onLearn }: { result: BossFightResult; bestScore: number; onRetry: () => void; onLearn: () => void }) {
  return (
    <section className="surface-hero mx-auto mt-6 max-w-4xl overflow-hidden p-6 text-center md:p-10">
      <p className="eyebrow !text-cyan-300">Boss Fight complete</p>
      <div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-cyan-300/16 bg-cyan-300/[0.055] text-5xl font-bold text-cyan-100 shadow-[0_18px_60px_rgba(34,211,238,.06)]">{result.grade}</div>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{result.score}<span className="text-base text-white/25">/100</span></p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/42">Every root cause was found. Your score shows how much of the diagnosis you completed without guessing or revealing hints.</p>
      <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-2 text-sm"><ResultMetric label="Wrong" value={result.wrongAttempts} /><ResultMetric label="Hints" value={result.hintsUsed} /><ResultMetric label="Best" value={bestScore} /></div>
      <div className="mt-8 flex flex-wrap justify-center gap-2"><button onClick={onRetry} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#07110f]">Retry for a better score</button><button onClick={onLearn} className="rounded-xl border border-white/9 px-5 py-3 text-sm font-semibold text-white/50">Back to learning</button></div>
    </section>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/7 bg-black/12 p-4"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/26">{label}</span><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
