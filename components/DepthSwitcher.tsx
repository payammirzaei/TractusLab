"use client";

import { useI18n } from "@/components/I18nProvider";
import type { LearningDepth } from "@/lib/simulator";

const depthIcons: Record<LearningDepth, string> = {
  business: "◎",
  architecture: "◇",
  developer: "{ }",
};

export function DepthSwitcher({ value, onChange }: { value: LearningDepth; onChange: (depth: LearningDepth) => void }) {
  const { t } = useI18n();
  const depthOptions: Array<{ id: LearningDepth; label: string; description: string; icon: string }> = [
    { id: "business", label: t("depth.manager"), description: t("depth.managerDescription"), icon: depthIcons.business },
    { id: "architecture", label: t("depth.architect"), description: t("depth.architectDescription"), icon: depthIcons.architecture },
    { id: "developer", label: t("depth.developer"), description: t("depth.developerDescription"), icon: depthIcons.developer },
  ];

  return (
    <div className="grid min-w-0 grid-cols-3 rounded-2xl border border-slate-200 bg-white/85 p-1 shadow-sm" aria-label={t("depth.aria")}>
      {depthOptions.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`min-w-0 rounded-xl px-2.5 py-2 text-left transition md:px-3 ${active ? "bg-emerald-600 text-white shadow-[0_8px_22px_rgba(5,150,105,.16)]" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
            aria-pressed={active}
            title={`${option.label}: ${option.description}`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`hidden text-[10px] font-black sm:inline ${active ? "text-white/80" : "text-slate-400"}`}>{option.icon}</span>
              <span className="truncate text-[11px] font-semibold md:text-xs">{option.label}</span>
            </span>
            <span className={`mt-0.5 hidden truncate text-[9px] lg:block ${active ? "text-white/80" : "text-slate-500"}`}>{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
