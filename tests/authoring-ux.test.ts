import assert from "node:assert/strict";
import test from "node:test";
import { scenarioDocuments } from "../data/content-registry.ts";
import { authoringReadiness, authoringStatusLabel } from "../lib/authoring-ux.ts";

test("published packaged scenarios are review-ready content", () => {
  const readiness = authoringReadiness(scenarioDocuments[0], []);
  assert.equal(readiness.percent, 100);
  assert.equal(authoringStatusLabel(readiness.percent), "Ready for review");
});

test("readiness exposes missing learning and diagnostic evidence", () => {
  const document = structuredClone(scenarioDocuments[0]);
  document.metadata.tags = [];
  document.scenario.challenges = [];
  const readiness = authoringReadiness(document, ["example validation issue"]);
  assert.ok(readiness.percent < 100);
  assert.equal(readiness.checks.find((item) => item.id === "valid")?.complete, false);
  assert.equal(readiness.checks.find((item) => item.id === "tags")?.complete, false);
  assert.equal(readiness.checks.find((item) => item.id === "diagnostics")?.complete, false);
});
