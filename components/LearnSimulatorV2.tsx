"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataspaceMap } from "@/components/DataspaceMap";
import { DepthSwitcher } from "@/components/DepthSwitcher";
import { EventTimeline } from "@/components/EventTimeline";
import { Glossary } from "@/components/Glossary";
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
                className={`rounded-full border px-3 py-1.5 text-xs transition ${item.id === scenario.id ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-white/10 text-white/40 hover:text-white/70"}`}
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
                <span>{scenario.useCase}</span><span>•</span><span>{scenario.asset}</span><span>•</span>
                <span>{mode === "learn" ? `${progress}% complete` : mode === "challenge" ? `Boss Fight ${challengeIndex + 1}/${scenario.challenges.length}` : "Boss Fight complete"}</span>
                {progressReady && persistedScenario && <><span>•</span><span>{persistedScenario.solvedChallenges.length}/{scenario.challenges.length} fixes saved</span></>}
                {bossScoresReady && bestBossScore !== undefined && <><span>•</span><span>Best score {bestBossScore}/100</span></>}
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em] md:text-5xl">{scenario.title}</h1>
              <p className="mt-3 max-w-3xl leading-7 text-white/55">{scenario.goal}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                onClick={() => setSimpleMode((value) => !value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${simpleMode ? "border-sky-300/45 bg-sky-300/10 text-sky-100" : "border-white/10 text-white/50 hover:text-white/75"}`}
              >
                {simpleMode ? "✓ I’m new mode" : "Explain like I’m new"}
              </button>
              {!simpleMode && <DepthSwitcher value={depth} onChange={setDepth} />}
            </div>
          </div>

          <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/8">
            <div className={`h-full rounded-full transition-all duration-500 ${mode === "challenge" ? "bg-amber-300" : mode === "results" ? "bg-cyan-300" : "bg-emerald-300"}`} style={{ width: `${mode === "learn" ? progress : 100}%` }} />
          </div>
        </section>

        {mode === "learn" ? (
          <>
            <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
              <div className="space-y-6">
                {simpleMode ? (
                  <SimpleStoryMap supplier={scenario.supplierLabel} manufacturer={scenario.manufacturerLabel} />
                ) : (
                  <DataspaceMap focus={complete ? ["supplier", "dataspace", "manufacturer"] : step.mapFocus} direction={complete ? "both" : step.direction} />
                )}
                <EventTimeline steps={scenario.steps} currentIndex={complete ? scenario.steps.length : stepIndex} depth={depth} simpleMode={simpleMode} />
              </div>

              <aside className="rounded-[2rem] border border-white/10 bg-[#0b1714] p-5 md:p-7">
                {complete ? (
                  <CompletionCard scenarioTitle={scenario.shortTitle} onRestart={() => resetScenario()} onBossFight={startBossFight} hasChallenges={scenario.challenges.length > 0} bestScore={bestBossScore} />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Step {stepIndex + 1} / {scenario.steps.length}</p>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">{simpleMode ? "Plain English" : step.technicalName}</span>
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em]">{step.question}</h2>

                    <div className={`mt-5 rounded-3xl border p-5 ${simpleMode ? "border-sky-300/15 bg-sky-300/[0.055]" : "border-emerald-300/15 bg-emerald-300/[0.055]"}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${simpleMode ? "text-sky-200/55" : "text-emerald-200/55"}`}>{simpleMode ? "What this means" : depthLabel(depth)}</p>
                      <p className="mt-2 leading-7 text-white/76">{simpleMode ? newcomerExplanation(step) : step[depth]}</p>
                    </div>

                    {!simpleMode && depth === "developer" && step.payload && (
                      <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-cyan-100/55">{step.payload}</div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <details className="rounded-2xl border border-white/10 bg-black/15 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-white/70">{simpleMode ? "Why do we need this?" : "Why is this needed?"}</summary>
                        <p className="mt-3 text-sm leading-6 text-white/48">{step.whyNeeded}</p>
                      </details>
                      <details className="rounded-2xl border border-white/10 bg-black/15 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-white/70">What if we skip it?</summary>
                        <p className="mt-3 text-sm leading-6 text-white/48">{step.withoutIt}</p>
                      </details>
                    </div>

                    {!simpleMode && <div className="mt-3"><Glossary terms={step.glossary} /></div>}

                    <div className="mt-7 flex items-center justify-between gap-3">
                      <button onClick={() => setStepIndex((value) => previousStepIndex(value))} disabled={stepIndex === 0} className="rounded-full border border-white/12 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30">Back</button>
                      <button onClick={() => setStepIndex((value) => nextStepIndex(value, scenario.steps.length))} className="rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-[#07110f] transition hover:translate-y-[-1px]">{simpleMode ? "Continue" : step.actionLabel} →</button>
                    </div>
                  </>
                )}
              </aside>
            </section>

            {!complete && (
              <section className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {scenario.steps.map((item, index) => (
                  <button key={item.id} onClick={() => setStepIndex(index)} className={`rounded-2xl border p-3 text-left text-xs transition ${index < stepIndex ? "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100/75" : index === stepIndex ? "border-white/25 bg-white/[0.055] text-white" : "border-white/8 text-white/30"}`}>
                    <span className="block text-[10px] uppercase tracking-wider opacity-50">{index + 1}</span>
                    <span className="mt-1 block font-medium">{simpleMode ? item.question : item.technicalName}</span>
                  </button>
                ))}
              </section>
            )}
          </>
        ) : mode === "challenge" && challenge ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-6">
              <DataspaceMap focus={["supplier-edc", "dataspace", "consumer-edc"]} direction="both" />
              <BossScoreCard score={liveBossScore.score} wrongAttempts={wrongAttempts} hintsUsed={hintsUsed} />
            </div>

            <aside className="rounded-[2rem] border border-amber-300/20 bg-[#17150b] p-5 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Boss Fight · Diagnose before guessing</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{challenge.title}</h2>
              <p className="mt-4 leading-7 text-white/62">{challenge.prompt}</p>
              <div className="mt-5 rounded-2xl border border-amber-200/10 bg-black/20 p-4 font-mono text-sm text-amber-100/70">{challenge.symptom}</div>

              <div className="mt-5 space-y-3">
                {challenge.options.map((option) => {
                  const selected = selectedOption === option.id;
                  return (
                    <button key={option.id} onClick={() => chooseChallengeOption(option.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? challengeResult?.correct ? "border-emerald-300/45 bg-emerald-300/10" : "border-rose-300/40 bg-rose-300/[0.08]" : "border-white/10 bg-black/10 hover:border-white/20"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="font-medium">{option.label}</span>{selected && <span>{challengeResult?.correct ? "✓" : "×"}</span>}</div>
                      {selected && <p className="mt-2 text-sm leading-6 text-white/50">{option.explanation}</p>}
                    </button>
                  );
                })}
              </div>

              {!challengeResult?.correct && <button onClick={revealHint} className="mt-4 text-sm text-amber-200/65 underline decoration-amber-200/20 underline-offset-4">Give me a hint · costs 18 points</button>}
              {showHint && !challengeResult?.correct && <p className="mt-3 rounded-2xl bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/65">💡 {challenge.hint}</p>}

              {challengeResult?.correct && (
                <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                  <p className="text-sm font-semibold text-emerald-200">Root cause found · saved locally</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">{challenge.rootCause}</p>
                  <button onClick={nextChallenge} className="mt-4 rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">{challengeIndex === scenario.challenges.length - 1 ? "See Boss Fight result" : "Next failure"} →</button>
                </div>
              )}
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
  if (depth === "business") return "Manager view — business meaning";
  if (depth === "architecture") return "Architect view — system relationship";
  return "Developer view — technical behavior";
}

function SimpleStoryMap({ supplier, manufacturer }: { supplier: string; manufacturer: string }) {
  return (
    <div className="rounded-[2rem] border border-sky-300/15 bg-sky-300/[0.035] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Simple story</p>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-3xl border border-white/10 bg-black/15 p-4 text-center"><div className="text-3xl">🏭</div><p className="mt-2 text-sm font-semibold">{supplier}</p><p className="mt-1 text-xs text-white/38">Has useful data</p></div>
        <div className="text-center"><p className="text-[10px] uppercase tracking-wider text-white/30">trusted exchange</p><p className="mt-1 text-3xl text-sky-300">↔</p></div>
        <div className="rounded-3xl border border-white/10 bg-black/15 p-4 text-center"><div className="text-3xl">🚗</div><p className="mt-2 text-sm font-semibold">{manufacturer}</p><p className="mt-1 text-xs text-white/38">Needs the data</p></div>
      </div>
    </div>
  );
}

function BossScoreCard({ score, wrongAttempts, hintsUsed }: { score: number; wrongAttempts: number; hintsUsed: number }) {
  return (
    <div className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.035] p-5">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-amber-300">Live score</p><p className="mt-2 text-4xl font-semibold">{score}<span className="text-lg text-white/30">/100</span></p></div><p className="text-right text-xs leading-5 text-white/35">Wrong answer −12<br />Hint −18</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-black/15 p-3"><span className="text-white/35">Wrong attempts</span><p className="mt-1 font-semibold">{wrongAttempts}</p></div><div className="rounded-xl bg-black/15 p-3"><span className="text-white/35">Hints used</span><p className="mt-1 font-semibold">{hintsUsed}</p></div></div>
    </div>
  );
}

function CompletionCard({ scenarioTitle, onRestart, onBossFight, hasChallenges, bestScore }: { scenarioTitle: string; onRestart: () => void; onBossFight: () => void; hasChallenges: boolean; bestScore?: number }) {
  return (
    <div className="flex min-h-[560px] flex-col justify-center">
      <div className="text-5xl">✓</div>
      <p className="mt-5 text-sm font-semibold text-emerald-300">Learning flow complete · saved locally</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">You can now explain the {scenarioTitle} flow. Now prove you can diagnose it when it breaks.</h2>
      {bestScore !== undefined && <p className="mt-4 text-sm text-cyan-200/65">Your best Boss Fight score: {bestScore}/100</p>}
      <div className="mt-7 flex flex-wrap gap-3">{hasChallenges && <button onClick={onBossFight} className="rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-[#171207]">Start Boss Fight →</button>}<button onClick={onRestart} className="rounded-full border border-white/12 px-6 py-2.5 text-sm text-white/70">Run again</button></div>
    </div>
  );
}

function BossResultCard({ result, bestScore, onRetry, onLearn }: { result: BossFightResult; bestScore: number; onRetry: () => void; onLearn: () => void }) {
  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.045] p-7 text-center md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Boss Fight complete</p>
      <div className="mt-6 text-7xl font-semibold">{result.grade}</div>
      <p className="mt-3 text-4xl font-semibold">{result.score}<span className="text-lg text-white/30">/100</span></p>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-white/55">You found every root cause. Your score reflects how much diagnosis you did without guessing or asking for hints.</p>
      <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-2 text-sm"><div className="rounded-2xl bg-black/15 p-4"><span className="text-white/35">Wrong</span><p className="mt-1 font-semibold">{result.wrongAttempts}</p></div><div className="rounded-2xl bg-black/15 p-4"><span className="text-white/35">Hints</span><p className="mt-1 font-semibold">{result.hintsUsed}</p></div><div className="rounded-2xl bg-black/15 p-4"><span className="text-white/35">Best</span><p className="mt-1 font-semibold">{bestScore}</p></div></div>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={onRetry} className="rounded-full bg-cyan-300 px-6 py-2.5 text-sm font-semibold text-[#07110f]">Retry for a better score</button><button onClick={onLearn} className="rounded-full border border-white/12 px-6 py-2.5 text-sm text-white/70">Back to learning</button></div>
    </section>
  );
}
