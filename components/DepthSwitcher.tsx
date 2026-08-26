import type { LearningDepth } from "@/lib/simulator";

const depthOptions: Array<{ id: LearningDepth; label: string; short: string; description: string; icon: string }> = [
  { id: "business", label: "Manager", short: "Manager", description: "Business meaning", icon: "◎" },
  { id: "architecture", label: "Architect", short: "Architect", description: "System relationships", icon: "◇" },
  { id: "developer", label: "Developer", short: "Developer", description: "Technical behavior", icon: "{ }" },
];

export function DepthSwitcher({ value, onChange }: { value: LearningDepth; onChange: (depth: LearningDepth) => void }) {
  return (
    <div className="grid min-w-0 grid-cols-3 rounded-2xl border border-white/9 bg-black/20 p-1" aria-label="Learning depth">
      {depthOptions.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`min-w-0 rounded-xl px-2.5 py-2 text-left transition md:px-3 ${active ? "bg-emerald-300 text-[#07110f] shadow-[0_8px_26px_rgba(110,231,183,.12)]" : "text-white/42 hover:bg-white/[0.045] hover:text-white/72"}`}
            aria-pressed={active}
            title={`${option.label}: ${option.description}`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`hidden text-[10px] font-black sm:inline ${active ? "text-[#07110f]/55" : "text-white/22"}`}>{option.icon}</span>
              <span className="truncate text-[11px] font-semibold md:text-xs">{option.short}</span>
            </span>
            <span className={`mt-0.5 hidden truncate text-[9px] lg:block ${active ? "text-[#07110f]/55" : "text-white/23"}`}>{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
