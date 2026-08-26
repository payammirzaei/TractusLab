import { validateScenarioDocument, type ScenarioContentDocument } from "./content";

export type PublishedContentEnvelope = {
  scenario_id: string;
  revision_number: number;
  document: unknown;
};

export type RuntimeContentMerge = {
  documents: ScenarioContentDocument[];
  overlayCount: number;
  rejectedCount: number;
  rejected: string[];
};

export function mergePublishedContent(
  packaged: ScenarioContentDocument[],
  remote: PublishedContentEnvelope[],
): RuntimeContentMerge {
  const packagedIds = packaged.map((item) => item.metadata.id);
  const byId = new Map(packaged.map((item) => [item.metadata.id, item]));
  const appendedIds: string[] = [];
  const rejected: string[] = [];
  let overlayCount = 0;

  for (const entry of remote) {
    const result = validateScenarioDocument(entry.document);
    const document = result.document;

    if (!document) {
      rejected.push(`${entry.scenario_id}: ${result.errors.join(" · ")}`);
      continue;
    }
    if (entry.revision_number < 1) {
      rejected.push(`${entry.scenario_id}: revision_number must be positive`);
      continue;
    }
    if (document.metadata.status !== "published") {
      rejected.push(`${entry.scenario_id}: document is not published`);
      continue;
    }
    if (document.metadata.id !== entry.scenario_id) {
      rejected.push(`${entry.scenario_id}: envelope id does not match document id`);
      continue;
    }

    if (!byId.has(entry.scenario_id)) appendedIds.push(entry.scenario_id);
    byId.set(entry.scenario_id, document);
    overlayCount += 1;
  }

  return {
    documents: [
      ...packagedIds.map((id) => byId.get(id)).filter((item): item is ScenarioContentDocument => Boolean(item)),
      ...appendedIds.map((id) => byId.get(id)).filter((item): item is ScenarioContentDocument => Boolean(item)),
    ],
    overlayCount,
    rejectedCount: rejected.length,
    rejected,
  };
}
