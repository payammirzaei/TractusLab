import type { LearningDepth, ScenarioStep } from "@/lib/simulator";

export function EventTimeline({
  steps,
  currentIndex,
  depth,
  simpleMode,
}: {
  steps: ScenarioStep[];
  currentIndex: number;
  depth: LearningDepth;
  simpleMode: boolean;
}) {
  const completed = Math.min(currentIndex, steps.length);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015))]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-5 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.65)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Exchange timeline</p>
          </div>
          <p className="mt-2 text-sm text-white/38">Past, active and upcoming events stay visible in one flow.</p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/45">
            {simpleMode ? "Plain-language flow" : depth === "developer" ? "Protocol-facing view" : "System flow"}
          </span>
          <p className="mt-2 text-[10px] text-white/25">{completed}/{steps.length} events reached</p>
        </div>
      </div>

      <div className="relative p-4 md:p-5">
        <div className="absolute bottom-5 left-[31px] top-5 w-px bg-white/8" />
        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            const upcoming = index > currentIndex;
            return (
              <div key={step.id} className={`relative grid grid-cols-[38px_1fr] gap-3 rounded-2xl p-2.5 transition-all duration-300 ${active ? "bg-cyan-300/[0.055]" : "hover:bg-white/[0.018]"}`}>
                <div className="relative z-10 flex justify-center pt-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${active ? "border-cyan-200 bg-cyan-300 text-[#07110f] shadow-[0_0_18px_rgba(103,232,249,.45)]" : done ? "border-emerald-300/25 bg-[#0b1714] text-emerald-200" : "border-white/10 bg-[#0a1210] text-white/25"}`}>
                    {done ? "✓" : index + 1}
                  </div>
                </div>

                <div className={`rounded-xl border px-3.5 py-3 transition-all ${active ? "border-cyan-300/20 bg-black/15" : done ? "border-transparent" : "border-transparent opacity-55"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${active ? "text-white" : done ? "text-white/62" : "text-white/42"}`}>{simpleMode ? step.question : step.technicalName}</p>
                        {active && <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-100/65">Now</span>}
                      </div>
                      {active && <p className="mt-1.5 text-xs leading-5 text-white/38">{simpleMode ? "This is the decision the learner is working through right now." : step.question}</p>}
                    </div>
                    {!simpleMode && <span className={`whitespace-nowrap text-[9px] uppercase tracking-[0.14em] ${active ? "text-cyan-200/50" : "text-white/20"}`}>{directionLabel(step.direction)}</span>}
                  </div>
                  {active && !simpleMode && depth === "developer" && step.payload && (
                    <div className="mt-3 rounded-xl border border-cyan-300/10 bg-[#050b09] px-3 py-2.5 font-mono text-[10px] leading-5 text-cyan-100/55">
                      <span className="mr-2 text-cyan-300/40">EVENT</span>{step.payload}
                    </div>
                  )}
                  {upcoming && <div className="mt-1 h-0.5 w-8 rounded-full bg-white/6" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function directionLabel(direction: ScenarioStep["direction"]) {
  if (direction === "supplier-to-manufacturer") return "provider → consumer";
  if (direction === "manufacturer-to-supplier") return "consumer → provider";
  if (direction === "both") return "two-way";
  return "internal";
}
