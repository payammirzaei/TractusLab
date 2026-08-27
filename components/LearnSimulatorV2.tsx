"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CarFront,
  CheckCircle2,
  Factory,
  Network,
  PanelsTopLeft,
  XCircle,
} from "lucide-react";
import { AskTractusMind } from "@/components/AskTractusMind";
import { DataspaceMap } from "@/components/DataspaceMap";
import { DepthSwitcher } from "@/components/DepthSwitcher";
import { EventTimeline } from "@/components/EventTimeline";
import { Glossary } from "@/components/Glossary";
import { LearnerNav } from "@/components/LearnerNav";
import { LearningJourney } from "@/components/LearningJourney";
import { LessonChallengeCard } from "@/components/LessonChallengeCard";
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

export function LearnSimulatorV2({
  initialScenarioId,
  initialMode,
}: {
  initialScenarioId?: string;
  initialMode?: "learn" | "challenge";
}) {
  const initialScenario = getScenarioById(initialScenarioId);
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [depth, setDepth] = useState<LearningDepth>("business");
  const [simpleMode, setSimpleMode] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode === "challenge" && initialScenario.challenges.length > 0 ? "challenge" : "learn");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptedWrongOptions, setAttemptedWrongOptions] = useState<string[]>([]);
  const [bossResult, setBossResult] = useState<BossFightResult | null>(null);
  const [restoredScenarioId, setRestoredScenarioId] = useState<string | null>(null);

  const { progress: savedProgress, ready: progressReady, demoMode, recordStep, solveChallenge } = useLearningProgress();
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
  const lessonChallengeCount = scenario.steps.filter((item) => Boolean(item.challenge)).length;
  const savedChallengeCount = persistedScenario?.solvedChallenges.length ?? 0;

  useEffect(() => {
    if (!progressReady || restoredScenarioId === scenario.id) return;
    const saved = savedProgress[scenario.id];
    if (saved?.completed) {
      setStepIndex(scenario.steps.length);
    } else if (saved && saved.maxStep > 0) {
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
              <select value={scenario.id} onChange={(event) => resetScenario(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                {learningScenarios.map((item) => <option key={item.id} value={item.id}>{item.shortTitle} · {item.useCase}</option>)}
              </select>
            </label>
            <Link href="/scenarios" className="button-ghost shrink-0">Browse</Link>
          </div>

          <div className="no-scrollbar hidden gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/70 p-1.5 shadow-sm md:flex dark:border-white/10 dark:bg-white/5">
            {learningScenarios.map((item) => (
              <button key={item.id} onClick={() => resetScenario(item.id)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${item.id === scenario.id ? "bg-slate-900 text-white shadow-sm dark:bg-white/10" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"}`}>
                {item.shortTitle}
              </button>
            ))}
            <Link href="/scenarios" className="ml-auto shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10">Browse all →</Link>
          </div>
        </section>

        {demoMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
            <span className="font-semibold">Demo mode is active. Progress is isolated from real learner accounts.</span>
            <Link href="/demo" className="font-bold text-blue-700 hover:underline dark:text-blue-200">Demo cockpit</Link>
          </div>
        )}

        <section className="surface-hero relative overflow-hidden p-5 md:p-7">
          <div className={`absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl ${modeColor === "amber" ? "bg-amber-300/[0.08]" : modeColor === "cyan" ? "bg-cyan-300/[0.08]" : "bg-emerald-300/[0.08]"}`} />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">{scenario.useCase}</span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">{scenario.asset}</span>
                <span className={`rounded-full border px-2.5 py-1 ${modeColor === "amber" ? "border-amber-200 text-amber-700 dark:border-amber-400/20 dark:text-amber-200" : modeColor === "cyan" ? "border-cyan-200 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-200" : "border-emerald-200 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-200"}`}>{modeLabel}</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-5xl">{scenario.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">{scenario.goal}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                {progressReady && <span>{savedChallengeCount}/{lessonChallengeCount + scenario.challenges.length} practice & diagnostic wins saved</span>}
                {bossScoresReady && bestBossScore !== undefined && <span>Best Boss score {bestBossScore}/100</span>}
              </div>
            </div>

            <div className="space-y-3">
              {mode === "learn" && (
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] xl:grid-cols-1">
                  <button onClick={() => setSimpleMode((value) => !value)} className={`rounded-2xl border px-4 py-3 text-left transition ${simpleMode ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-100" : "border-slate-200 bg-white/70 text-slate-600 hover:border-blue-200 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                    <span className="block text-xs font-semibold">{simpleMode ? "Beginner-friendly language on" : "New to dataspaces?"}</span>
                    <span className="mt-0.5 block text-[10px] opacity-65">{simpleMode ? "Technical jargon is hidden." : "Switch to plain-English explanations."}</span>
                  </button>
                  {!simpleMode && <DepthSwitcher value={depth} onChange={setDepth} />}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400"><span>{mode === "learn" ? "Learning progress" : mode === "challenge" ? "Diagnostic run" : "Completed"}</span><span>{mode === "learn" ? `${progress}%` : "100%"}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full transition-all duration-500 ${modeColor === "amber" ? "bg-amber-500" : modeColor === "cyan" ? "bg-cyan-500" : "bg-emerald-500"}`} style={{ width: `${mode === "learn" ? progress : 100}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {scenario.id === "battery-pcf" && <div className="mt-4"><LearningJourney compact /></div>}

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
                      <div><p className="eyebrow">Now · Step {stepIndex + 1}</p><p className="mt-1 text-[11px] text-slate-400">{simpleMode ? "Plain-English mode" : depthLabel(depth)}</p></div>
                      <span className="max-w-[45%] truncate rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{simpleMode ? "No jargon" : step.technicalName}</span>
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold leading-[1.18] tracking-[-0.035em] md:text-3xl">{step.question}</h2>

                    <div className={`mt-5 rounded-2xl border p-4 md:p-5 ${simpleMode ? "border-sky-200 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/[0.08]" : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]"}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${simpleMode ? "text-sky-700 dark:text-sky-200" : "text-emerald-700 dark:text-emerald-200"}`}>{simpleMode ? "What this means" : "Explanation"}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200 md:text-base">{simpleMode ? (step.simpleExplanation ?? newcomerExplanation(step)) : step[depth]}</p>
                    </div>

                    {(step.architectureHint || step.realWorldExample || step.keyTakeaway) && (
                      <div className="mt-3 grid gap-2">
                        {step.architectureHint && <LessonInsight icon={<Network size={15} />} label="Architecture hint" text={step.architectureHint} />}
                        {step.realWorldExample && <LessonInsight label="Real-world example" text={step.realWorldExample} />}
                        {step.keyTakeaway && <LessonInsight icon={<CheckCircle2 size={15} />} label="Key takeaway" text={step.keyTakeaway} accent="green" />}
                      </div>
                    )}

                    {!simpleMode && depth === "developer" && step.payload && <div className="mt-3 overflow-x-auto rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 font-mono text-[11px] leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/[0.08] dark:text-cyan-100">{step.payload}</div>}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <details className="rounded-2xl border border-slate-200 bg-white p-3.5 open:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:open:bg-white/[0.07]"><summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">Why is this needed?</summary><p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">{step.whyNeeded}</p></details>
                      <details className="rounded-2xl border border-slate-200 bg-white p-3.5 open:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:open:bg-white/[0.07]"><summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">What breaks without it?</summary><p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">{step.withoutIt}</p></details>
                    </div>

                    {!simpleMode && <div className="mt-3"><Glossary terms={step.glossary} /></div>}

                    <div className="mt-4">
                      <AskTractusMind context={{ concept: step.technicalName, question: step.question, explanation: step.simpleExplanation ?? step.business, scenarioId: scenario.id, stepId: step.id, sourceHint: step.glossary.join(", ") }} />
                    </div>

                    {step.challenge && (
                      <div className="mt-5">
                        <LessonChallengeCard
                          key={`${scenario.id}-${step.id}-${step.challenge.id}`}
                          challenge={step.challenge}
                          solved={Boolean(persistedScenario?.solvedChallenges.includes(step.challenge.id))}
                          onSolved={() => solveChallenge(scenario.id, step.challenge!.id)}
                        />
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
                      <button onClick={() => setStepIndex((value) => previousStepIndex(value))} disabled={stepIndex === 0} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">← Back</button>
                      <button onClick={() => setStepIndex((value) => nextStepIndex(value, scenario.steps.length))} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700">{simpleMode ? "Continue" : step.actionLabel} →</button>
                    </div>
                  </>
                )}
              </aside>

              <details className="surface-card overflow-hidden xl:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="inline-flex items-center gap-2"><PanelsTopLeft size={16} className="text-blue-600 dark:text-blue-300" />Open visual workspace</span><span className="text-xs font-normal text-slate-400">Map + timeline</span></summary>
                <div className="space-y-4 border-t border-slate-200 p-3 dark:border-white/10 md:p-4">
                  {simpleMode ? <SimpleStoryMap supplier={scenario.supplierLabel} manufacturer={scenario.manufacturerLabel} /> : <DataspaceMap focus={complete ? ["supplier", "dataspace", "manufacturer"] : step.mapFocus} direction={complete ? "both" : step.direction} />}
                  <EventTimeline steps={scenario.steps} currentIndex={complete ? scenario.steps.length : stepIndex} depth={depth} simpleMode={simpleMode} onStepSelect={setStepIndex} />
                </div>
              </details>
            </section>

            {!complete && (
              <section className="mt-4">
                <div className="mb-2 flex items-center justify-between px-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Jump to a step</p><span className="text-[10px] text-slate-400">Tap any concept</span></div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {scenario.steps.map((item, index) => (
                    <button key={item.id} onClick={() => setStepIndex(index)} className={`min-w-[150px] shrink-0 rounded-2xl border p-3 text-left transition md:min-w-[175px] ${index < stepIndex ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200" : index === stepIndex ? "border-blue-200 bg-blue-50 text-slate-900 shadow-sm dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-white" : "border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"}`}>
                      <span className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] opacity-65"><span>Step {index + 1}</span>{index < stepIndex ? <CheckCircle2 size={12} /> : <span>{index === stepIndex ? "Now" : ""}</span>}</span>
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
            <aside className="rounded-[1.75rem] border border-amber-200 bg-amber-50/65 p-5 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/[0.07] md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Boss Fight · Diagnose first</p><span className="rounded-xl border border-amber-200 bg-white px-2.5 py-1 text-[10px] text-amber-700 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-100">Live score {liveBossScore.score}/100</span></div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em]">{challenge.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">{challenge.prompt}</p>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 font-mono text-xs leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-100 md:text-sm">{challenge.symptom}</div>

              <div className="mt-5 space-y-2.5">
                {challenge.options.map((option) => {
                  const selected = selectedOption === option.id;
                  return (
                    <button key={option.id} onClick={() => chooseChallengeOption(option.id)} className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[.99] ${selected ? challengeResult?.correct ? "border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10" : "border-rose-300 bg-rose-50 motion-safe:animate-[pulse_0.55s_ease-in-out_1] dark:border-rose-400/30 dark:bg-rose-400/10" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-white/5"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold md:text-base">{option.label}</span>{selected && (challengeResult?.correct ? <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-300" /> : <XCircle size={18} className="text-rose-600 dark:text-rose-300" />)}</div>
                      {selected && <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300 md:text-sm">{option.explanation}</p>}
                    </button>
                  );
                })}
              </div>

              {!challengeResult?.correct && <button onClick={revealHint} className="mt-4 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-200">Reveal hint · −18 points</button>}
              {showHint && !challengeResult?.correct && <p className="mt-3 rounded-2xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-100">Hint: {challenge.hint}</p>}

              {challengeResult && !challengeResult.correct && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/[0.08]">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-rose-700 dark:text-rose-200">Why this is wrong</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{challengeResult.explanation}</p>
                  <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">Relevant concept: {challenge.concept ?? "Governed exchange"}</p>
                  <button type="button" onClick={resetChallengeState} className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-white/5 dark:text-rose-200">Retry</button>
                </div>
              )}

              {challengeResult?.correct && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200"><CheckCircle2 size={16} />Root cause found</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{challenge.rootCause}</p>{challenge.takeaway && <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">Key takeaway: {challenge.takeaway}</p>}<button onClick={nextChallenge} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">{challengeIndex === scenario.challenges.length - 1 ? "See result" : "Next failure"} →</button></div>}

              <div className="mt-4"><AskTractusMind context={{ concept: challenge.concept ?? challenge.title, question: challenge.prompt, explanation: challenge.rootCause, scenarioId: scenario.id, sourceHint: challenge.takeaway }} /></div>
              <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:hidden"><summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">Open map & score details</summary><div className="mt-3 space-y-3"><DataspaceMap focus={["supplier-edc", "dataspace", "consumer-edc"]} direction="both" /><BossScoreCard score={liveBossScore.score} wrongAttempts={wrongAttempts} hintsUsed={hintsUsed} /></div></details>
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

function LessonInsight({ icon, label, text, accent = "blue" }: { icon?: React.ReactNode; label: string; text: string; accent?: "blue" | "green" }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent === "green" ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]" : "border-blue-100 bg-blue-50/50 dark:border-blue-400/15 dark:bg-blue-400/[0.06]"}`}>
      <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${accent === "green" ? "text-emerald-700 dark:text-emerald-200" : "text-blue-700 dark:text-blue-200"}`}>{icon}{label}</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function SimpleStoryMap({ supplier, manufacturer }: { supplier: string; manufacturer: string }) {
  return (
    <div className="surface-card p-4 md:p-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow !text-sky-600 dark:!text-sky-300">Simple story</p><p className="mt-1 text-xs text-slate-400">One trusted exchange, without protocol vocabulary.</p></div><span className="rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">Beginner view</span></div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5 md:p-4"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"><Factory size={20} /></div><p className="mt-2 truncate text-xs font-semibold md:text-sm">{supplier}</p><p className="mt-1 text-[10px] text-slate-400">Has useful data</p></div>
        <div className="text-center"><p className="hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:block">trusted exchange</p><ArrowLeftRight className="mx-auto mt-2 text-blue-600 dark:text-blue-300" size={28} /></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5 md:p-4"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200"><CarFront size={20} /></div><p className="mt-2 truncate text-xs font-semibold md:text-sm">{manufacturer}</p><p className="mt-1 text-[10px] text-slate-400">Needs the data</p></div>
      </div>
    </div>
  );
}

function BossScoreCard({ score, wrongAttempts, hintsUsed }: { score: number; wrongAttempts: number; hintsUsed: number }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-end justify-between gap-4"><div><p className="eyebrow !text-amber-600 dark:!text-amber-300">Live score</p><p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{score}<span className="text-base text-slate-400">/100</span></p></div><p className="text-right text-[10px] leading-5 text-slate-400">Wrong answer −12<br />Hint −18</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"><span className="text-slate-400">Wrong attempts</span><p className="mt-1 text-lg font-semibold">{wrongAttempts}</p></div><div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"><span className="text-slate-400">Hints used</span><p className="mt-1 text-lg font-semibold">{hintsUsed}</p></div></div>
    </div>
  );
}

function CompletionCard({ scenarioTitle, onRestart, onBossFight, hasChallenges, bestScore }: { scenarioTitle: string; onRestart: () => void; onBossFight: () => void; hasChallenges: boolean; bestScore?: number }) {
  return (
    <div className="flex min-h-[390px] flex-col justify-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm"><CheckCircle2 size={26} /></div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Learning flow complete</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em]">You can explain the {scenarioTitle} flow. Now prove you can diagnose it.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-300">Boss Fights turn the happy-path model into troubleshooting skill. Wrong guesses and hints reduce the score.</p>
      {bestScore !== undefined && <p className="mt-4 text-xs font-semibold text-cyan-700 dark:text-cyan-200">Personal best: {bestScore}/100</p>}
      <div className="mt-7 flex flex-wrap gap-2">{hasChallenges && <button onClick={onBossFight} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white">Start Boss Fight →</button>}<button onClick={onRestart} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Run again</button></div>
    </div>
  );
}

function BossResultCard({ result, bestScore, onRetry, onLearn }: { result: BossFightResult; bestScore: number; onRetry: () => void; onLearn: () => void }) {
  return (
    <section className="surface-hero mx-auto mt-6 max-w-4xl overflow-hidden p-6 text-center md:p-10">
      <p className="eyebrow !text-cyan-700 dark:!text-cyan-300">Boss Fight complete</p>
      <div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-cyan-200 bg-cyan-50 text-5xl font-bold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">{result.grade}</div>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{result.score}<span className="text-base text-slate-400">/100</span></p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-300">Every root cause was found. Your score shows how much of the diagnosis you completed without guessing or revealing hints.</p>
      <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-2 text-sm"><ResultMetric label="Wrong" value={result.wrongAttempts} /><ResultMetric label="Hints" value={result.hintsUsed} /><ResultMetric label="Best" value={bestScore} /></div>
      <div className="mt-8 flex flex-wrap justify-center gap-2"><button onClick={onRetry} className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white">Retry for a better score</button><button onClick={onLearn} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Back to learning</button></div>
    </section>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
