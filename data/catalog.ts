import { publishedScenarioDocuments } from "./content-registry";
import type { ScenarioContentDocument } from "../lib/content";
import { DEFAULT_LOCALE, type Locale } from "../lib/i18n";
import { localizeScenarios } from "../lib/scenario-i18n";

let activeLocale: Locale = DEFAULT_LOCALE;
let runtimeDocuments: ScenarioContentDocument[] = [...publishedScenarioDocuments];

function runtimeScenarios() {
  return localizeScenarios(runtimeDocuments.map((document) => document.scenario), activeLocale);
}

export const learningScenarios = runtimeScenarios();

export function setCatalogLocale(locale: Locale) {
  activeLocale = locale;
  learningScenarios.splice(0, learningScenarios.length, ...runtimeScenarios());
}

export function replaceRuntimeScenarioDocuments(documents: ScenarioContentDocument[]) {
  runtimeDocuments = [...documents];
  learningScenarios.splice(0, learningScenarios.length, ...runtimeScenarios());
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
