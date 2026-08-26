import assert from "node:assert/strict";
import test from "node:test";
import { learningScenarios } from "../data/catalog.ts";
import { filterScenarioDiscovery, recommendedScenario, scenarioDiscoveryRows } from "../lib/discovery.ts";
import type { LearningProgress } from "../lib/progress.ts";


test("scenario discovery derives progress states", () => {
  const progress: LearningProgress = {
    "battery-pcf": { maxStep: 2, completed: false, solvedChallenges: [] },
    "digital-twin": { maxStep: 99, completed: true, solvedChallenges: ["twin-not-found"] },
  };
  const rows = scenarioDiscoveryRows(learningScenarios, progress);
  assert.equal(rows.find((row) => row.scenario.id === "battery-pcf")?.status, "in-progress");
  assert.equal(rows.find((row) => row.scenario.id === "digital-twin")?.status, "complete");
  assert.equal(rows.find((row) => row.scenario.id === "traceability")?.status, "not-started");
});


test("recommended scenario prefers an active learning flow", () => {
  const progress: LearningProgress = {
    "digital-twin": { maxStep: 1, completed: false, solvedChallenges: [] },
  };
  const recommended = recommendedScenario(scenarioDiscoveryRows(learningScenarios, progress));
  assert.equal(recommended?.scenario.id, "digital-twin");
});


test("discovery filter combines status and text search", () => {
  const rows = scenarioDiscoveryRows(learningScenarios, {});
  const quality = filterScenarioDiscovery(rows, "not-started", "quality");
  assert.equal(quality.length, 1);
  assert.equal(quality[0].scenario.id, "quality-management");
  assert.equal(filterScenarioDiscovery(rows, "complete", "").length, 0);
});
