"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { batteryPcfSteps } from "@/data/battery-pcf";

export default function LearnPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [showTechnical, setShowTechnical] = useState(false);

  const done = stepIndex >= batteryPcfSteps.length;
  const step = batteryPcfSteps[Math.min(stepIndex, batteryPcfSteps.length - 1)];
  const progress = Math.round((Math.min(stepIndex, batteryPcfSteps.length) / batteryPcfSteps.length) * 100);

  const activeLabel = useMemo(() => (done ? "Data shared" : step.technicalName), [done, step]);

  return (
    <main className="min-h-screen px-5 py-6 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold">← TractusLab</Link>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span>Battery PCF</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>{progress}%</span>
          </div>
        </header>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-300 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Live story</p>
                <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Battery BAT-12345</h1>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/55">{activeLabel}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
              <Participant title="Supplier A" icon="🏭" active={!done && (step.from === "supplier" || step.from === "both")} />
              <FlowArrow active={!done} label={done ? "complete" : step.technicalName} />
              <Participant title="Manufacturer" icon="🚗" active={!done && (step.from === "oem" || step.from === "both")} />
            </div>

            <div className="mt-8 rounded-3xl border border-white/8 bg-black/20 p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Business goal</p>
              <p className="mt-3 text-lg leading-8 text-white/80">
                Manufacturer needs the product carbon footprint of this battery, while Supplier A keeps control over how the data is shared.
              </p>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#0b1714] p-6 md:p-8">
            {done ? (
              <DoneCard onRestart={() => { setStepIndex(0); setShowTechnical(false); }} />
            ) : (
              <>
                <p className="text-sm font-semibold text-emerald-300">{step.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em]">{step.question}</h2>
                <p className="mt-5 leading-7 text-white/62">{step.explanation}</p>

                <div className="mt-7 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.055] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/60">Now you know the idea</p>
                  <p className="mt-2 text-xl font-semibold">This is called {step.technicalName}.</p>
                </div>

                <button
                  onClick={() => setShowTechnical((value) => !value)}
                  className="mt-4 text-sm font-medium text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white"
                >
                  {showTechnical ? "Hide technical meaning" : "Show technical meaning"}
                </button>

                {showTechnical && (
                  <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm leading-6 text-white/58">
                    {step.technicalHint}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setShowTechnical(false); }}
                    disabled={stepIndex === 0}
                    className="rounded-full border border-white/12 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setStepIndex((value) => value + 1); setShowTechnical(false); }}
                    className="rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-[#07110f]"
                  >
                    {stepIndex === batteryPcfSteps.length - 1 ? "Share the data" : "Continue"} →
                  </button>
                </div>
              </>
            )}
          </aside>
        </section>

        <section className="mt-8 grid grid-cols-5 gap-2">
          {batteryPcfSteps.map((item, index) => (
            <div key={item.id} className={`rounded-2xl border p-3 text-center text-xs transition ${index < stepIndex ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : index === stepIndex && !done ? "border-white/25 bg-white/[0.06] text-white" : "border-white/8 text-white/30"}`}>
              {item.technicalName}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Participant({ title, icon, active }: { title: string; icon: string; active: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 text-center transition-all duration-500 md:p-6 ${active ? "border-emerald-300/50 bg-emerald-300/10 shadow-lg shadow-emerald-950/20" : "border-white/10 bg-black/15"}`}>
      <div className="text-4xl md:text-5xl">{icon}</div>
      <p className="mt-3 font-semibold">{title}</p>
    </div>
  );
}

function FlowArrow({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="min-w-20 text-center">
      <p className="mb-2 hidden text-[10px] uppercase tracking-widest text-white/35 md:block">{label}</p>
      <div className={`text-4xl transition ${active ? "text-emerald-300" : "text-white/25"}`}>→</div>
    </div>
  );
}

function DoneCard({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex min-h-[470px] flex-col justify-center">
      <div className="text-5xl">✓</div>
      <p className="mt-5 text-sm font-semibold text-emerald-300">Mission complete</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">The CO₂ data was shared — with control.</h2>
      <p className="mt-5 leading-7 text-white/62">
        You just walked through the core idea of a dataspace: know who is asking, discover the offer, check the rules, agree, then transfer.
      </p>
      <div className="mt-6 rounded-2xl bg-white/[0.045] p-5 text-sm leading-7 text-white/60">
        <strong className="text-white">Identity → Catalog → Policy → Contract → Transfer</strong>
        <br />
        The technical names came after the business problem — not before it.
      </div>
      <button onClick={onRestart} className="mt-7 self-start rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-[#07110f]">
        Run it again
      </button>
    </div>
  );
}
