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
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,.28)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Exchange timeline</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">Past, active and upcoming events stay visible in one flow.</p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
            {simpleMode ? "Plain-language flow" : depth === "developer" ? "Protocol-facing view" : "System flow"}
          </span>
          <p className="mt-2 text-[10px] text-slate-500">{completed}/{steps.length} events reached</p>
        </div>
      </div>

      <div className="relative p-4 md:p-5">
        <div className="absolute bottom-5 left-[31px] top-5 w-px bg-slate-200" />
        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            const upcoming = index > currentIndex;
            return (
              <div key={step.id} className={`relative grid grid-cols-[38px_1fr] gap-3 rounded-2xl p-2.5 transition-all duration-300 ${active ? "bg-blue-50/80" : "hover:bg-slate-50"}`}>
                <div className="relative z-10 flex justify-center pt-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${active ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_16px_rgba(37,99,235,.22)]" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                    {done ? "✓" : index + 1}
                  </div>
                </div>

                <div className={`rounded-xl border px-3.5 py-3 transition-all ${active ? "border-blue-100 bg-white" : done ? "border-transparent" : "border-transparent opacity-70"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-600"}`}>{simpleMode ? step.question : step.technicalName}</p>
                        {active && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">Now</span>}
                      </div>
                      {active && <p className="mt-1.5 text-xs leading-5 text-slate-600">{simpleMode ? "This is the decision the learner is working through right now." : step.question}</p>}
                    </div>
                    {!simpleMode && <span className={`whitespace-nowrap text-[9px] uppercase tracking-[0.14em] ${active ? "text-blue-600" : "text-slate-400"}`}>{directionLabel(step.direction)}</span>}
                  </div>
                  {active && !simpleMode && depth === "developer" && step.payload && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 font-mono text-[10px] leading-5 text-blue-800">
                      <span className="mr-2 font-semibold text-blue-500">EVENT</span>{step.payload}
                    </div>
                  )}
                  {upcoming && <div className="mt-1 h-0.5 w-8 rounded-full bg-slate-200" />}
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
