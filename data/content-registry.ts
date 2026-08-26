import { circularEconomyScenario } from "./circular-economy";
import { demandCapacityScenario } from "./demand-capacity";
import { qualityScenario } from "./quality";
import { learningScenarios as coreScenarios } from "./scenarios";
import { traceabilityScenario } from "./traceability";
import {
  createScenarioDocument,
  validateScenarioCatalog,
  type ScenarioContentDocument,
} from "../lib/content";
import type { LearningScenario } from "../lib/simulator";

const sourceScenarios: LearningScenario[] = [
  ...coreScenarios,
  traceabilityScenario,
  demandCapacityScenario,
  qualityScenario,
  circularEconomyScenario,
];

const metadataByScenarioId: Record<
  string,
  { version: string; tags: string[]; summary: string }
> = {
  "battery-pcf": {
    version: "1.0.0",
    tags: ["foundation", "pcf", "sustainability", "edc"],
    summary: "Learn one governed Product Carbon Footprint exchange from business need to controlled transfer.",
  },
  "digital-twin": {
    version: "1.0.0",
    tags: ["digital-twin", "dtr", "semantics"],
    summary: "Discover a component digital twin, resolve a submodel, and separate discovery from protected access.",
  },
  traceability: {
    version: "1.0.0",
    tags: ["traceability", "quality", "digital-twin"],
    summary: "Follow part relationships across company boundaries and diagnose broken traceability flows.",
  },
  "demand-capacity": {
    version: "1.0.0",
    tags: ["planning", "demand", "capacity", "edc"],
    summary: "Coordinate planning data without exposing internal ERP systems or surrendering data control.",
  },
  quality: {
    version: "1.0.0",
    tags: ["quality", "collaboration", "semantics"],
    summary: "Investigate a quality issue through governed cross-company data exchange and shared meaning.",
  },
  "circular-economy": {
    version: "1.0.0",
    tags: ["circularity", "product-passport", "digital-twin"],
    summary: "Assemble trusted product information for circular-economy and product-passport decisions.",
  },
};

export const scenarioDocuments: ScenarioContentDocument[] = sourceScenarios.map((scenario) => {
  const metadata = metadataByScenarioId[scenario.id] ?? {
    version: "1.0.0",
    tags: [],
    summary: scenario.goal,
  };

  return createScenarioDocument(scenario, {
    ...metadata,
    status: "published",
  });
});

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
