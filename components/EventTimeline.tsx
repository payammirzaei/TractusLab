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
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Event timeline</p>
          <p className="mt-1 text-sm text-white/40">See what has happened, what is active, and what comes next.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">
          {simpleMode ? "Plain-language flow" : depth === "developer" ? "Protocol-facing view" : "System flow"}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <div
              key={step.id}
              className={`grid grid-cols-[auto_1fr] gap-3 rounded-2xl border p-3 transition ${
                active
                  ? "border-cyan-300/35 bg-cyan-300/[0.07]"
                  : done
                    ? "border-emerald-300/15 bg-emerald-300/[0.035]"
                    : "border-white/8 bg-black/10"
              }`}
            >
              <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-cyan-300 text-[#07110f]" : done ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-white/25"}`}>
                {done ? "✓" : index + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${active ? "text-white" : done ? "text-white/65" : "text-white/30"}`}>
                    {simpleMode ? step.question : step.technicalName}
                  </p>
                  {!simpleMode && <span className="text-[10px] uppercase tracking-wider text-white/25">{directionLabel(step.direction)}</span>}
                </div>
                {active && !simpleMode && depth === "developer" && step.payload && (
                  <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 font-mono text-[11px] leading-5 text-cyan-100/55">{step.payload}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function directionLabel(direction: ScenarioStep["direction"]) {
  if (direction === "supplier-to-manufacturer") return "provider → consumer";
  if (direction === "manufacturer-to-supplier") return "consumer → provider";
  if (direction === "both") return "two-way";
  return "inside one participant";
}
