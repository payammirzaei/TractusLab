import type { LearningDepth } from "@/lib/simulator";

const depthOptions: Array<{ id: LearningDepth; label: string; description: string }> = [
  { id: "business", label: "Manager", description: "What problem does this solve?" },
  { id: "architecture", label: "Architect", description: "How do the pieces connect?" },
  { id: "developer", label: "Developer", description: "What happens technically?" },
];

export function DepthSwitcher({ value, onChange }: { value: LearningDepth; onChange: (depth: LearningDepth) => void }) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-black/20 p-1" aria-label="Learning depth">
      {depthOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-xl px-3 py-2 text-left transition ${
            value === option.id ? "bg-emerald-300 text-[#07110f]" : "text-white/55 hover:bg-white/[0.05] hover:text-white"
          }`}
          aria-pressed={value === option.id}
          title={option.description}
        >
          <span className="block text-xs font-semibold md:text-sm">{option.label}</span>
          <span className={`mt-0.5 hidden text-[10px] md:block ${value === option.id ? "text-[#07110f]/60" : "text-white/30"}`}>
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}
