"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import packageJson from "@/package.json";
import { LearnerNav } from "@/components/LearnerNav";
import { ProgressRing } from "@/components/ProgressRing";
import { useBossScores } from "@/components/useBossScores";
import { useLearningProgress } from "@/components/useLearningProgress";
import { achievements, coreScenarioIds } from "@/data/achievements";
import { competencies, curriculumMissions } from "@/data/curriculum";
import { competencyEarned, curriculumCompletionPercent, recommendedMission } from "@/lib/curriculum";
import { achievementEarned, learnerStats, LEARNER_NAME_STORAGE_KEY, masteryCertificateUnlocked, sanitizeLearnerName } from "@/lib/profile";
import { getCurrentAccount, serverSyncEnabled, syncDisplayName } from "@/lib/server-sync";

export function LearnerProfile() {
  const { progress, ready: progressReady } = useLearningProgress();
  const { scores, ready: scoresReady } = useBossScores();
  const [name, setName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [nameSync, setNameSync] = useState<"local" | "syncing" | "synced">("local");
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    const stored = sanitizeLearnerName(window.localStorage.getItem(LEARNER_NAME_STORAGE_KEY) ?? "");
    setName(stored);
    setNameReady(true);

    if (!serverSyncEnabled()) return;
    setNameSync("syncing");
    void getCurrentAccount()
      .then((account) => {
        const remoteName = sanitizeLearnerName(account?.display_name ?? "");
        if (remoteName) {
          setName(remoteName);
          window.localStorage.setItem(LEARNER_NAME_STORAGE_KEY, remoteName);
        }
        setNameSync("synced");
      })
      .catch(() => setNameSync("local"));
  }, []);

  const ready = progressReady && scoresReady && nameReady;

  const summary = useMemo(() => {
    const stats = learnerStats(progress, scores, achievements);
    const earnedAchievements = achievements.filter((item) => achievementEarned(item, progress, scores));
    const earnedCompetencies = competencies.filter((item) => competencyEarned(item, progress, scores));
    const certificateUnlocked = masteryCertificateUnlocked(progress, scores, [...coreScenarioIds]);
    const pathPercent = curriculumCompletionPercent(curriculumMissions, progress, scores);
    const recommended = recommendedMission(curriculumMissions, progress, scores);
    return { stats, earnedAchievements, earnedCompetencies, certificateUnlocked, pathPercent, recommended };
  }, [progress, scores]);

  function updateName(value: string) {
    const clean = sanitizeLearnerName(value);
    setName(clean);
    window.localStorage.setItem(LEARNER_NAME_STORAGE_KEY, clean);
    if (!serverSyncEnabled()) {
      setNameSync("local");
      return;
    }
    setNameSync("syncing");
    void syncDisplayName(clean).then(() => setNameSync("synced")).catch(() => setNameSync("local"));
  }

  const displayName = name || "Local Learner";
  const visibleAchievements = showLocked ? achievements : achievements.filter((item) => ready && achievementEarned(item, progress, scores));

  return (
    <main className="min-h-screen pb-16">
      <div className="print:hidden"><LearnerNav active="profile" eyebrow="Learning evidence" /></div>
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <section className="grid gap-5 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="surface-hero relative overflow-hidden p-6 md:p-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/[0.07] blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/10 text-3xl font-semibold text-emerald-100 shadow-[0_18px_60px_rgba(16,185,129,.12)]">
                {(displayName.trim()[0] || "L").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Learning profile</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">{displayName}</h1>
                <p className="mt-3 max-w-2xl leading-7 text-white/48">Your simulations, diagnostic evidence, competencies and mastery proof live here.</p>
              </div>
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Scenarios" value={ready ? `${summary.stats.completedScenarios}/${coreScenarioIds.length}` : "—"} hint="completed" />
              <Stat label="Boss mastery" value={ready ? String(summary.stats.masteredBosses) : "—"} hint="70+ scores" />
              <Stat label="Best diagnosis" value={ready ? `${summary.stats.bestBossScore}/100` : "—"} hint="Boss Fight" />
              <Stat label="Achievements" value={ready ? `${summary.stats.earnedAchievements}/${achievements.length}` : "—"} hint="unlocked" />
            </div>
          </div>

          <aside className="surface-panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/32">Identity</p>
                <h2 className="mt-2 text-xl font-semibold">How your name appears</h2>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${nameSync === "synced" ? "bg-emerald-300/10 text-emerald-200" : nameSync === "syncing" ? "bg-cyan-300/10 text-cyan-100" : "bg-white/[0.05] text-white/35"}`}>
                {nameSync === "synced" ? "Synced" : nameSync === "syncing" ? "Syncing" : "Local"}
              </span>
            </div>
            <label className="mt-6 block text-xs font-medium text-white/45" htmlFor="learner-name">Display name</label>
            <input
              id="learner-name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="input-field mt-2"
            />
            <p className="mt-3 text-xs leading-5 text-white/30">Used on your profile and mastery certificate. Server sync activates automatically when the API is configured.</p>
          </aside>
        </section>

        {!ready ? (
          <ProfileSkeleton />
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="surface-panel flex items-center gap-6 p-6">
                <ProgressRing value={summary.pathPercent} label="Path" size="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Core journey</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{summary.pathPercent === 100 ? "Path complete" : "Keep the momentum"}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/42">{summary.earnedCompetencies.length}/{competencies.length} competencies earned.</p>
                </div>
              </div>

              <div className={`surface-panel p-6 ${summary.recommended ? "border-emerald-300/16" : "border-cyan-300/15"}`}>
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{summary.recommended ? "Recommended next" : "Core mastery"}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{summary.recommended?.title ?? "You cleared the guided path."}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">{summary.recommended?.description ?? "Review scenarios, improve Boss Fight scores or explore your earned evidence below."}</p>
                  </div>
                  {summary.recommended?.scenarioId ? (
                    <Link href={`/learn/${summary.recommended.scenarioId}`} className="button-primary">Continue mission →</Link>
                  ) : (
                    <Link href="/scenarios" className="button-secondary">Explore scenarios</Link>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Achievements</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Evidence you earned by doing the work.</h2>
                </div>
                <button type="button" onClick={() => setShowLocked((value) => !value)} className="button-ghost text-xs">
                  {showLocked ? "Show unlocked only" : `Show all ${achievements.length}`}
                </button>
              </div>

              {visibleAchievements.length === 0 ? (
                <div className="surface-panel mt-6 p-8 text-center">
                  <p className="text-sm text-white/42">No achievements yet. Your first completed governed exchange will unlock one.</p>
                  <Link href="/path" className="button-primary mt-5">Start mission path →</Link>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {visibleAchievements.map((achievement) => {
                    const earned = achievementEarned(achievement, progress, scores);
                    return (
                      <article key={achievement.id} className={`group rounded-[1.6rem] border p-5 transition ${earned ? "border-emerald-300/18 bg-emerald-300/[0.04] hover:-translate-y-0.5" : "border-white/7 bg-black/10 opacity-55"}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className={`grid h-11 w-11 place-items-center rounded-2xl border text-xl ${earned ? "border-emerald-300/20 bg-emerald-300/10" : "border-white/8 bg-white/[0.02] grayscale"}`}>{achievement.icon}</div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${earned ? "text-emerald-300" : "text-white/25"}`}>{earned ? "Unlocked" : "Locked"}</span>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">{achievement.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/40">{achievement.description}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Competencies</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">What you can now explain or diagnose.</h2>
                </div>
                <span className="text-sm text-white/35">{summary.earnedCompetencies.length}/{competencies.length} earned</span>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {competencies.map((competency) => {
                  const earned = competencyEarned(competency, progress, scores);
                  return (
                    <article key={competency.id} className={`rounded-[1.6rem] border p-5 ${earned ? "border-cyan-300/15 bg-cyan-300/[0.035]" : "border-white/7 bg-black/10"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold">{competency.label}</h3>
                        <span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${earned ? "bg-emerald-300/12 text-emerald-200" : "bg-white/[0.04] text-white/25"}`}>{earned ? "✓" : "○"}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/40">{competency.description}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-14">
              {summary.certificateUnlocked ? (
                <Certificate name={displayName} onPrint={() => window.print()} />
              ) : (
                <div className="surface-hero overflow-hidden p-7 text-center md:p-10 print:hidden">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-black/20 text-2xl text-white/25">◆</div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Mastery certificate locked</p>
                  <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em]">Finish all six scenarios and score 70+ in three Boss Fights.</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/40">You have {summary.stats.completedScenarios}/6 scenarios complete and {summary.stats.masteredBosses}/3 mastered Boss Fights.</p>
                  <Link href="/path" className="button-primary mt-6">Continue mission path →</Link>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-label="Loading learning profile">
      {[0, 1, 2].map((item) => <div key={item} className="surface-panel h-40 animate-pulse bg-white/[0.025]" />)}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-[11px] text-white/25">{hint}</p>
    </div>
  );
}

function Certificate({ name, onPrint }: { name: string; onPrint: () => void }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-[#0b1714] shadow-2xl shadow-black/20 print:border-black print:bg-white print:text-black print:shadow-none">
      <div className="h-1 bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300" />
      <div className="p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300 print:text-black">TractusLab</p>
            <p className="mt-1 text-sm text-white/40 print:text-black/60">Simulation-first Tractus-X learning</p>
          </div>
          <button onClick={onPrint} className="button-secondary print:hidden">Print certificate</button>
        </div>

        <div className="py-14 text-center md:py-20">
          <p className="text-sm uppercase tracking-[0.24em] text-white/38 print:text-black/55">Certificate of mastery</p>
          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">{name}</h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/55 print:text-black/65">has completed the TractusLab core learning path and demonstrated diagnostic mastery across Tractus-X dataspace simulations.</p>
          <div className="mx-auto mt-10 h-px max-w-xl bg-white/12 print:bg-black/20" />
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-white/45 print:text-black/65">
            <span className="rounded-full border border-white/10 px-3 py-1.5 print:border-black/20">6 core scenarios</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 print:border-black/20">3 Boss Fights at 70+</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 print:border-black/20">Dataspace Troubleshooter</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5 text-xs text-white/32 print:border-black/20 print:text-black/55">
          <span>Generated from TractusLab learning evidence.</span>
          <span>TractusLab v{packageJson.version}</span>
        </div>
      </div>
    </div>
  );
}
