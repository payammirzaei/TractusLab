"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, FlaskConical, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { LearningJourney } from "@/components/LearningJourney";
import { enableDemoMode, resetDemoMode } from "@/lib/demo-mode";

const demoBeats = [
  { icon: Play, label: "Open lesson", detail: "Battery PCF starts in the middle of a realistic supplier → partner story." },
  { icon: FlaskConical, label: "Make a decision", detail: "Choose a component, workflow or architecture answer instead of only reading." },
  { icon: ShieldCheck, label: "See the consequence", detail: "A wrong answer explains what breaks, gives a clue and lets you retry." },
  { icon: CheckCircle2, label: "Watch progress move", detail: "Correct answers update the isolated demo learning state." },
  { icon: BrainCircuit, label: "Ask TractusMind", detail: "Hand the exact lesson context to Find & Understand for a deeper, sourced explanation." },
] as const;

export function DemoExperience() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    enableDemoMode(window.localStorage);
    setReady(true);
  }, []);

  function reset() {
    resetDemoMode(window.localStorage);
    window.location.reload();
  }

  if (!ready) {
    return <div className="mx-auto mt-16 h-40 max-w-5xl animate-pulse rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5" />;
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <section className="surface-hero overflow-hidden p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
              <Play size={13} /> Demo mode · isolated state
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">From complex documentation to confident adoption.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">A zero-setup TractusLab walkthrough for the ARENA2036 demo. Nothing here changes a real learner account or production progress.</p>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <RotateCcw size={14} /> Reset demo
          </button>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link href="/learn/battery-pcf?demo=1" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700">
            <Play size={16} /> Start 90-second demo
          </Link>
          <Link href="/learn/battery-pcf?mode=challenge&demo=1" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
            <ShieldCheck size={16} /> Jump to validation
          </Link>
        </div>
      </section>

      <div className="mt-6"><LearningJourney /></div>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div><p className="eyebrow">Demo story</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">Five beats. One coherent learning loop.</h2></div>
          <span className="hidden text-xs font-semibold text-slate-400 md:block">Designed for a 60–90 second walkthrough</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {demoBeats.map((beat, index) => {
            const Icon = beat.icon;
            return (
              <div key={beat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200"><Icon size={17} /></span><span className="text-[10px] font-bold text-slate-300">0{index + 1}</span></div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{beat.label}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{beat.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
