import { publishedScenarioDocuments } from "./content-registry";

export const learningScenarios = publishedScenarioDocuments.map((document) => document.scenario);

export function getScenarioById(id: string | null | undefined) {
  if (!id) return learningScenarios[0];
  return learningScenarios.find((scenario) => scenario.id === id) ?? learningScenarios[0];
}

export function scenarioCount() {
  return learningScenarios.length;
}
