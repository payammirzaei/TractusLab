"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBossScores } from "@/components/useBossScores";
import { useLearningProgress } from "@/components/useLearningProgress";
import { achievements, coreScenarioIds } from "@/data/achievements";
import { competencies } from "@/data/curriculum";
import { competencyEarned } from "@/lib/curriculum";
import { achievementEarned, learnerStats, LEARNER_NAME_STORAGE_KEY, masteryCertificateUnlocked, sanitizeLearnerName } from "@/lib/profile";
import { getCurrentAccount, serverSyncEnabled, syncDisplayName } from "@/lib/server-sync";

export function LearnerProfile() {
  const { progress, ready: progressReady } = useLearningProgress();
  const { scores, ready: scoresReady } = useBossScores();
  const [name, setName] = useState("");
  const [nameReady, setNameReady] = useState(false);

  useEffect(() => {
    const stored = sanitizeLearnerName(window.localStorage.getItem(LEARNER_NAME_STORAGE_KEY) ?? "");
    setName(stored);
    setNameReady(true);

    if (!serverSyncEnabled()) return;
    void getCurrentAccount()
      .then((account) => {
        const remoteName = sanitizeLearnerName(account?.display_name ?? "");
        if (!remoteName) return;
        setName(remoteName);
        window.localStorage.setItem(LEARNER_NAME_STORAGE_KEY, remoteName);
      })
      .catch(() => undefined);
  }, []);

  const ready = progressReady && scoresReady && nameReady;

  const summary = useMemo(() => {
    const stats = learnerStats(progress, scores, achievements);
    const earnedAchievements = achievements.filter((item) => achievementEarned(item, progress, scores));
    const earnedCompetencies = competencies.filter((item) => competencyEarned(item, progress, scores));
    const certificateUnlocked = masteryCertificateUnlocked(progress, scores, [...coreScenarioIds]);
    return { stats, earnedAchievements, earnedCompetencies, certificateUnlocked };
  }, [progress, scores]);

  function updateName(value: string) {
    const clean = sanitizeLearnerName(value);
    setName(clean);
    window.localStorage.setItem(LEARNER_NAME_STORAGE_KEY, clean);
    void syncDisplayName(clean).catch(() => undefined);
  }

  const displayName = name || "Local Learner";

  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/account" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white/80">Account</Link>
            <Link href="/path" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white/80">Mission path</Link>
            <Link href="/scenarios" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white/80">Scenarios</Link>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 text-xs text-emerald-100/70">Learner profile</span>
          </div>
        </header>

        <section className="grid gap-7 py-12 md:py-16 lg:grid-cols-[1fr_330px] lg:items-end print:hidden">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Learning identity</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Your TractusLab progress, in one place.</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">Achievements come from completed simulations and diagnostic performance. Nothing here is manually awarded.</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
            <label className="text-xs uppercase tracking-[0.18em] text-white/35" htmlFor="learner-name">Display name</label>
            <input
              id="learner-name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Your name"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-300/35"
            />
            <p className="mt-3 text-xs leading-5 text-white/30">Synced to your account when the API is enabled; cached locally otherwise.</p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
          <Stat label="Scenarios" value={ready ? `${summary.stats.completedScenarios}/${coreScenarioIds.length}` : "—"} />
          <Stat label="Boss mastery" value={ready ? String(summary.stats.masteredBosses) : "—"} />
          <Stat label="Best score" value={ready ? String(summary.stats.bestBossScore) : "—"} />
          <Stat label="Boss average" value={ready ? String(summary.stats.averageBossScore) : "—"} />
          <Stat label="Achievements" value={ready ? `${summary.stats.earnedAchievements}/${achievements.length}` : "—"} />
        </section>

        <section className="mt-12 print:hidden">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Achievements</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Milestones earned by doing the work.</h2>
            </div>
            <span className="text-sm text-white/40">{ready ? `${summary.earnedAchievements.length}/${achievements.length} unlocked` : "—"}</span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => {
              const earned = ready && achievementEarned(achievement, progress, scores);
              return (
                <div key={achievement.id} className={`rounded-3xl border p-5 ${earned ? "border-emerald-300/22 bg-emerald-300/[0.05]" : "border-white/8 bg-black/10 opacity-65"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl ${earned ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-white/25"}`}>{achievement.icon}</div>
                    <span className={`text-xs font-semibold ${earned ? "text-emerald-300" : "text-white/25"}`}>{earned ? "UNLOCKED" : "LOCKED"}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{achievement.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/42">{achievement.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-14 border-t border-white/10 pt-10 print:hidden">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Competencies</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">What the learner can now explain or diagnose.</h2>
            </div>
            <span className="text-sm text-white/40">{ready ? `${summary.earnedCompetencies.length}/${competencies.length} earned` : "—"}</span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {competencies.map((competency) => {
              const earned = ready && competencyEarned(competency, progress, scores);
              return (
                <div key={competency.id} className={`rounded-3xl border p-5 ${earned ? "border-emerald-300/20 bg-emerald-300/[0.04]" : "border-white/8 bg-black/10"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{competency.label}</h3>
                    <span className={earned ? "text-emerald-300" : "text-white/20"}>{earned ? "✓" : "○"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/42">{competency.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-14 pb-16">
          {ready && summary.certificateUnlocked ? (
            <Certificate name={displayName} onPrint={() => window.print()} />
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 text-center print:hidden md:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl text-white/25">◆</div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/32">Mastery certificate locked</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Finish all six scenarios and score 70+ in three Boss Fights.</h2>
              <Link href="/path" className="mt-6 inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">Continue mission path →</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-white/30">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function Certificate({ name, onPrint }: { name: string; onPrint: () => void }) {
  return (
    <div className="rounded-[2rem] border border-emerald-300/25 bg-[#0b1714] p-6 shadow-2xl shadow-black/20 md:p-10 print:border-black print:bg-white print:text-black print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300 print:text-black">TractusLab</p>
          <p className="mt-1 text-sm text-white/40 print:text-black/60">Simulation-first Tractus-X learning</p>
        </div>
        <button onClick={onPrint} className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 print:hidden">Print certificate</button>
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
        <span>TractusLab v0.9</span>
      </div>
    </div>
  );
}
