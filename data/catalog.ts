import { learningScenarios as coreScenarios } from "./scenarios";
import { traceabilityScenario } from "./traceability";
import { demandCapacityScenario } from "./demand-capacity";

export const learningScenarios = [
  ...coreScenarios,
  traceabilityScenario,
  demandCapacityScenario,
];

export function getScenarioById(id: string | null | undefined) {
  if (!id) return learningScenarios[0];
  return learningScenarios.find((scenario) => scenario.id === id) ?? learningScenarios[0];
}

export function scenarioCount() {
  return learningScenarios.length;
}
