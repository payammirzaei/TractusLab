import type { LearningScenario } from "./simulator";
import { scenarioCompletionPercent, type LearningProgress } from "./progress";

export type ScenarioDiscoveryStatus = "not-started" | "in-progress" | "complete";
export type ScenarioDiscoveryFilter = "all" | ScenarioDiscoveryStatus;

export type ScenarioDiscoveryRow = {
  scenario: LearningScenario;
  percent: number;
  solved: number;
  status: ScenarioDiscoveryStatus;
};

export function scenarioDiscoveryRows(scenarios: LearningScenario[], progress: LearningProgress): ScenarioDiscoveryRow[] {
  return scenarios.map((scenario) => {
    const percent = scenarioCompletionPercent(progress, scenario.id, scenario.steps.length);
    const status: ScenarioDiscoveryStatus = percent === 100 ? "complete" : percent > 0 ? "in-progress" : "not-started";
    return {
      scenario,
      percent,
      solved: progress[scenario.id]?.solvedChallenges.length ?? 0,
      status,
    };
  });
}

export function filterScenarioDiscovery(
  rows: ScenarioDiscoveryRow[],
  filter: ScenarioDiscoveryFilter,
  query: string,
): ScenarioDiscoveryRow[] {
  const normalized = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter !== "all" && row.status !== filter) return false;
    if (!normalized) return true;
    const haystack = [
      row.scenario.shortTitle,
      row.scenario.title,
      row.scenario.useCase,
      row.scenario.goal,
      row.scenario.asset,
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

export function recommendedScenario(rows: ScenarioDiscoveryRow[]): ScenarioDiscoveryRow | null {
  return rows.find((row) => row.status === "in-progress")
    ?? rows.find((row) => row.status === "not-started")
    ?? rows[0]
    ?? null;
}
