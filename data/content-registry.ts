import { packagedScenarioDocuments } from "../content/documents";
import { validateScenarioCatalog, type ScenarioContentDocument } from "../lib/content";

export const scenarioDocuments: ScenarioContentDocument[] = packagedScenarioDocuments;

export const publishedScenarioDocuments = scenarioDocuments.filter(
  (document) => document.metadata.status === "published",
);

export const contentRegistryValidation = validateScenarioCatalog(scenarioDocuments);

export function getContentDocumentByScenarioId(id: string | null | undefined) {
  if (!id) return publishedScenarioDocuments[0];
  return publishedScenarioDocuments.find((document) => document.metadata.id === id) ?? publishedScenarioDocuments[0];
}

export function getScenarioDocumentVersion(id: string): string | null {
  return scenarioDocuments.find((document) => document.metadata.id === id)?.metadata.version ?? null;
}
