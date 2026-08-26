import { learningScenarios as coreScenarios } from "./scenarios";
import { traceabilityScenario } from "./traceability";
import { demandCapacityScenario } from "./demand-capacity";
import { qualityScenario } from "./quality";
import { circularEconomyScenario } from "./circular-economy";

export const learningScenarios = [
  ...coreScenarios,
  traceabilityScenario,
  demandCapacityScenario,
  qualityScenario,
  circularEconomyScenario,
];

export function getScenarioById(id: string | null | undefined) {
  if (!id) return learningScenarios[0];
  return learningScenarios.find((scenario) => scenario.id === id) ?? learningScenarios[0];
}

export function scenarioCount() {
  return learningScenarios.length;
}
