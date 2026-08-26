import type { ScenarioContentDocument } from "./content";

export type ReadinessCheck = {
  id: string;
  label: string;
  complete: boolean;
};

export function authoringReadiness(document: ScenarioContentDocument | null, validationErrors: string[]) {
  if (!document) {
    return {
      percent: 0,
      checks: [
        { id: "valid", label: "Document passes validation", complete: false },
      ] satisfies ReadinessCheck[],
    };
  }

  const scenario = document.scenario;
  const checks: ReadinessCheck[] = [
    { id: "valid", label: "Document passes validation", complete: validationErrors.length === 0 },
    { id: "summary", label: "Clear summary and learning goal", complete: document.metadata.summary.trim().length >= 20 && scenario.goal.trim().length >= 40 },
    { id: "tags", label: "At least two useful discovery tags", complete: document.metadata.tags.length >= 2 },
    { id: "steps", label: "At least three learning steps", complete: scenario.steps.length >= 3 },
    { id: "depths", label: "Every step covers all three learning depths", complete: scenario.steps.every((step) => Boolean(step.business.trim() && step.architecture.trim() && step.developer.trim())) },
    { id: "diagnostics", label: "At least one Boss Fight diagnostic", complete: scenario.challenges.length >= 1 },
  ];

  return {
    checks,
    percent: Math.round((checks.filter((item) => item.complete).length / checks.length) * 100),
  };
}

export function authoringStatusLabel(percent: number) {
  if (percent === 100) return "Ready for review";
  if (percent >= 70) return "Nearly ready";
  if (percent >= 40) return "Work in progress";
  return "Early draft";
}
