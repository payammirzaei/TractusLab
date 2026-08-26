import { publishedScenarioDocuments } from "./content-registry";
import type { ScenarioContentDocument } from "../lib/content";

export const learningScenarios = publishedScenarioDocuments.map((document) => document.scenario);

let runtimeDocuments: ScenarioContentDocument[] = [...publishedScenarioDocuments];

export function replaceRuntimeScenarioDocuments(documents: ScenarioContentDocument[]) {
  runtimeDocuments = [...documents];
  learningScenarios.splice(0, learningScenarios.length, ...documents.map((document) => document.scenario));
}

export function getRuntimeScenarioDocuments() {
  return runtimeDocuments;
}

export function getScenarioById(id: string | null | undefined) {
  if (!id) return learningScenarios[0];
  return learningScenarios.find((scenario) => scenario.id === id) ?? learningScenarios[0];
}

export function scenarioCount() {
  return learningScenarios.length;
}
