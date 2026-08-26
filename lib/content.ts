import {
  validateScenario,
  type Challenge,
  type FlowDirection,
  type LearningScenario,
  type ScenarioStep,
} from "./simulator";

export const CONTENT_SCHEMA_VERSION = "1.0" as const;
export const CONTENT_DRAFT_STORAGE_KEY = "tractuslab-authoring-draft-v1";

export type ContentStatus = "draft" | "published" | "archived";

export type ScenarioContentMetadata = {
  id: string;
  version: string;
  status: ContentStatus;
  tags: string[];
  summary?: string;
};

export type ScenarioContentDocument = {
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  kind: "scenario";
  metadata: ScenarioContentMetadata;
  scenario: LearningScenario;
};

export type ContentValidationResult = {
  valid: boolean;
  errors: string[];
  document: ScenarioContentDocument | null;
};

const CONTENT_STATUSES = new Set<ContentStatus>(["draft", "published", "archived"]);
const FLOW_DIRECTIONS = new Set<FlowDirection>([
  "manufacturer-to-supplier",
  "supplier-to-manufacturer",
  "both",
  "internal",
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateStep(value: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return [`Step ${index + 1} must be an object.`];

  const requiredTextFields: Array<keyof ScenarioStep> = [
    "id",
    "technicalName",
    "question",
    "business",
    "architecture",
    "developer",
    "whyNeeded",
    "withoutIt",
    "actionLabel",
  ];

  for (const field of requiredTextFields) {
    if (!isNonEmptyString(value[field])) errors.push(`Step ${index + 1} requires ${field}.`);
  }

  if (isNonEmptyString(value.id) && !SLUG_PATTERN.test(value.id)) {
    errors.push(`Step ${index + 1} id must be a lowercase slug.`);
  }

  if (!isNonEmptyString(value.direction) || !FLOW_DIRECTIONS.has(value.direction as FlowDirection)) {
    errors.push(`Step ${index + 1} has an invalid direction.`);
  }

  if (!isStringArray(value.mapFocus)) errors.push(`Step ${index + 1} mapFocus must be a string array.`);
  if (!isStringArray(value.glossary)) errors.push(`Step ${index + 1} glossary must be a string array.`);
  if (value.payload !== undefined && typeof value.payload !== "string") {
    errors.push(`Step ${index + 1} payload must be a string when provided.`);
  }

  return errors;
}

function validateChallenge(value: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return [`Challenge ${index + 1} must be an object.`];

  for (const field of ["id", "title", "prompt", "symptom", "hint", "correctOptionId", "rootCause"] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`Challenge ${index + 1} requires ${field}.`);
  }

  if (isNonEmptyString(value.id) && !SLUG_PATTERN.test(value.id)) {
    errors.push(`Challenge ${index + 1} id must be a lowercase slug.`);
  }

  if (!Array.isArray(value.options) || value.options.length < 2) {
    errors.push(`Challenge ${index + 1} must contain at least two options.`);
    return errors;
  }

  const optionIds = new Set<string>();
  for (const [optionIndex, option] of value.options.entries()) {
    if (!isRecord(option)) {
      errors.push(`Challenge ${index + 1} option ${optionIndex + 1} must be an object.`);
      continue;
    }
    for (const field of ["id", "label", "explanation"] as const) {
      if (!isNonEmptyString(option[field])) {
        errors.push(`Challenge ${index + 1} option ${optionIndex + 1} requires ${field}.`);
      }
    }
    if (isNonEmptyString(option.id)) {
      if (optionIds.has(option.id)) errors.push(`Challenge ${index + 1} has duplicate option id: ${option.id}`);
      optionIds.add(option.id);
    }
  }

  if (isNonEmptyString(value.correctOptionId) && !optionIds.has(value.correctOptionId)) {
    errors.push(`Challenge ${index + 1} correctOptionId does not match an option.`);
  }

  return errors;
}

function validateScenarioShape(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["scenario must be an object."];

  for (const field of [
    "id",
    "title",
    "shortTitle",
    "useCase",
    "asset",
    "goal",
    "supplierLabel",
    "manufacturerLabel",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`Scenario requires ${field}.`);
  }

  if (isNonEmptyString(value.id) && !SLUG_PATTERN.test(value.id)) {
    errors.push("Scenario id must be a lowercase slug.");
  }

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    errors.push("Scenario must contain at least one learning step.");
  } else {
    value.steps.forEach((step, index) => errors.push(...validateStep(step, index)));
  }

  if (!Array.isArray(value.challenges)) {
    errors.push("Scenario challenges must be an array.");
  } else {
    value.challenges.forEach((challenge, index) => errors.push(...validateChallenge(challenge, index)));
  }

  return errors;
}

export function validateScenarioDocument(value: unknown): ContentValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["Content document must be an object."], document: null };

  if (value.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${CONTENT_SCHEMA_VERSION}.`);
  }
  if (value.kind !== "scenario") errors.push('kind must be "scenario".');

  if (!isRecord(value.metadata)) {
    errors.push("metadata must be an object.");
  } else {
    if (!isNonEmptyString(value.metadata.id)) errors.push("metadata.id is required.");
    else if (!SLUG_PATTERN.test(value.metadata.id)) errors.push("metadata.id must be a lowercase slug.");

    if (!isNonEmptyString(value.metadata.version) || !SEMVER_PATTERN.test(value.metadata.version)) {
      errors.push("metadata.version must use x.y.z semantic versioning.");
    }

    if (!isNonEmptyString(value.metadata.status) || !CONTENT_STATUSES.has(value.metadata.status as ContentStatus)) {
      errors.push("metadata.status must be draft, published, or archived.");
    }

    if (!isStringArray(value.metadata.tags)) errors.push("metadata.tags must be a string array.");
    if (value.metadata.summary !== undefined && typeof value.metadata.summary !== "string") {
      errors.push("metadata.summary must be a string when provided.");
    }
  }

  errors.push(...validateScenarioShape(value.scenario));

  if (isRecord(value.metadata) && isRecord(value.scenario)) {
    if (isNonEmptyString(value.metadata.id) && isNonEmptyString(value.scenario.id) && value.metadata.id !== value.scenario.id) {
      errors.push("metadata.id must match scenario.id.");
    }

    if (errors.length === 0) {
      errors.push(...validateScenario(value.scenario as unknown as LearningScenario));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    document: errors.length === 0 ? (value as unknown as ScenarioContentDocument) : null,
  };
}

export function parseScenarioDocument(raw: string): ContentValidationResult {
  try {
    return validateScenarioDocument(JSON.parse(raw) as unknown);
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : "Unknown parser error"}`],
      document: null,
    };
  }
}

export function createScenarioDocument(
  scenario: LearningScenario,
  options: Partial<Omit<ScenarioContentMetadata, "id">> = {},
): ScenarioContentDocument {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    kind: "scenario",
    metadata: {
      id: scenario.id,
      version: options.version ?? "1.0.0",
      status: options.status ?? "draft",
      tags: options.tags ?? [],
      ...(options.summary ? { summary: options.summary } : {}),
    },
    scenario,
  };
}

export function serializeScenarioDocument(document: ScenarioContentDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function createScenarioTemplate(): ScenarioContentDocument {
  const scenario: LearningScenario = {
    id: "new-scenario",
    title: "New governed data exchange",
    shortTitle: "New scenario",
    useCase: "Draft use case",
    asset: "ASSET-001",
    goal: "Describe the business outcome the learner needs to achieve.",
    supplierLabel: "Data Provider",
    manufacturerLabel: "Data Consumer",
    steps: [
      {
        id: "first-step",
        technicalName: "First Concept",
        question: "What problem needs to be solved first?",
        business: "Explain the business meaning without protocol jargon.",
        architecture: "Explain which architectural responsibility appears here.",
        developer: "Explain the technical behavior or contract a developer would inspect.",
        whyNeeded: "Explain why this concept exists.",
        withoutIt: "Explain what breaks if this concept is missing.",
        actionLabel: "Continue",
        direction: "both",
        mapFocus: ["dataspace"],
        glossary: [],
      },
    ],
    challenges: [
      {
        id: "first-diagnosis",
        title: "Diagnose the first failure",
        prompt: "What should the learner inspect first?",
        symptom: "Expected flow ❌",
        hint: "Point to the relevant responsibility without giving away the answer.",
        correctOptionId: "correct",
        rootCause: "Describe the root cause.",
        options: [
          { id: "correct", label: "Inspect the right layer", explanation: "Correct. Explain why this diagnosis fits the evidence." },
          { id: "wrong", label: "Inspect an unrelated layer", explanation: "This does not explain the observed failure." },
        ],
      },
    ],
  };

  return createScenarioDocument(scenario, {
    version: "0.1.0",
    status: "draft",
    tags: ["draft"],
    summary: "Starter document for a new TractusLab scenario.",
  });
}

export function validateScenarioCatalog(documents: unknown[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const [index, value] of documents.entries()) {
    const result = validateScenarioDocument(value);
    for (const error of result.errors) errors.push(`Document ${index + 1}: ${error}`);
    if (!result.document) continue;

    const id = result.document.metadata.id;
    if (ids.has(id)) errors.push(`Duplicate scenario document id: ${id}`);
    ids.add(id);
  }

  return { valid: errors.length === 0, errors };
}

export function contentSummary(document: ScenarioContentDocument) {
  return {
    id: document.metadata.id,
    version: document.metadata.version,
    status: document.metadata.status,
    title: document.scenario.title,
    useCase: document.scenario.useCase,
    steps: document.scenario.steps.length,
    challenges: document.scenario.challenges.length,
  };
}

export type { Challenge, LearningScenario };
