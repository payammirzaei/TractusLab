import assert from "node:assert/strict";
import test from "node:test";
import { scenarioDocuments } from "../data/content-registry.ts";
import {
  createScenarioTemplate,
  parseScenarioDocument,
  serializeScenarioDocument,
  validateScenarioCatalog,
  validateScenarioDocument,
} from "../lib/content.ts";


test("all packaged scenario documents are valid and uniquely registered", () => {
  assert.equal(scenarioDocuments.length, 6);
  const result = validateScenarioCatalog(scenarioDocuments);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(new Set(scenarioDocuments.map((item) => item.metadata.id)).size, 6);
  assert.ok(scenarioDocuments.every((item) => item.metadata.status === "published"));
});


test("scenario template is a valid draft document", () => {
  const template = createScenarioTemplate();
  const result = validateScenarioDocument(template);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.document?.metadata.status, "draft");
  assert.equal(result.document?.metadata.version, "0.1.0");
});


test("serialized content round-trips through parser", () => {
  const source = scenarioDocuments[0];
  const parsed = parseScenarioDocument(serializeScenarioDocument(source));
  assert.equal(parsed.valid, true, parsed.errors.join("\n"));
  assert.equal(parsed.document?.metadata.id, source.metadata.id);
  assert.equal(parsed.document?.scenario.steps.length, source.scenario.steps.length);
});


test("invalid JSON returns an author-friendly parser error", () => {
  const parsed = parseScenarioDocument('{"kind":');
  assert.equal(parsed.valid, false);
  assert.match(parsed.errors[0], /^Invalid JSON:/);
});


test("document metadata must match the runtime scenario id", () => {
  const document = structuredClone(scenarioDocuments[0]);
  document.metadata.id = "different-id";
  const result = validateScenarioDocument(document);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("metadata.id must match scenario.id."));
});


test("challenge correct answer must reference a real option", () => {
  const document = structuredClone(scenarioDocuments[0]);
  document.scenario.challenges[0].correctOptionId = "missing-option";
  const result = validateScenarioDocument(document);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("correctOptionId")));
});


test("catalog rejects duplicate scenario documents", () => {
  const result = validateScenarioCatalog([scenarioDocuments[0], scenarioDocuments[0]]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate scenario document id")));
});
