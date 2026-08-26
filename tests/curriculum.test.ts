import test from "node:test";
import assert from "node:assert/strict";
import { competencies, curriculumMissions } from "../data/curriculum";
import {
  competencyEarned,
  curriculumCompletionPercent,
  missionState,
  recommendedMission,
} from "../lib/curriculum";
import type { BossScores } from "../lib/boss";
import type { LearningProgress } from "../lib/progress";

function completedScenarioProgress(ids: string[]): LearningProgress {
  return Object.fromEntries(
    ids.map((id) => [id, { maxStep: 99, completed: true, solvedChallenges: [] }]),
  );
}

test("curriculum starts with one foundation mission and locks dependent concepts", () => {
  const progress: LearningProgress = {};
  const scores: BossScores = {};

  assert.equal(missionState(curriculumMissions[0], curriculumMissions, progress, scores), "available");
  assert.equal(missionState(curriculumMissions[1], curriculumMissions, progress, scores), "locked");
  assert.equal(recommendedMission(curriculumMissions, progress, scores)?.id, "foundation-pcf");
});

test("completing foundations unlocks digital twin and demand-capacity branches", () => {
  const progress = completedScenarioProgress(["battery-pcf"]);
  const scores: BossScores = {};

  const digitalTwin = curriculumMissions.find((item) => item.id === "digital-twin")!;
  const demandCapacity = curriculumMissions.find((item) => item.id === "demand-capacity")!;
  const traceability = curriculumMissions.find((item) => item.id === "traceability")!;

  assert.equal(missionState(digitalTwin, curriculumMissions, progress, scores), "available");
  assert.equal(missionState(demandCapacity, curriculumMissions, progress, scores), "available");
  assert.equal(missionState(traceability, curriculumMissions, progress, scores), "locked");
});

test("mastery gate requires all learning missions plus three boss scores at 70 or higher", () => {
  const scenarioIds = curriculumMissions.flatMap((mission) => mission.scenarioId ? [mission.scenarioId] : []);
  const progress = completedScenarioProgress(scenarioIds);
  const mastery = curriculumMissions.find((item) => item.id === "mastery-gate")!;

  assert.equal(missionState(mastery, curriculumMissions, progress, { "battery-pcf": 91, "digital-twin": 80 }), "available");
  assert.equal(missionState(mastery, curriculumMissions, progress, { "battery-pcf": 91, "digital-twin": 80, traceability: 70 }), "complete");
  assert.equal(curriculumCompletionPercent(curriculumMissions, progress, { "battery-pcf": 91, "digital-twin": 80, traceability: 70 }), 100);
});

test("competencies are earned from scenario completion and diagnostic mastery", () => {
  const progress = completedScenarioProgress(["battery-pcf", "digital-twin"]);
  const foundation = competencies.find((item) => item.id === "dataspace-foundations")!;
  const circularity = competencies.find((item) => item.id === "circularity-data")!;
  const diagnostics = competencies.find((item) => item.id === "diagnostics")!;

  assert.equal(competencyEarned(foundation, progress, {}), true);
  assert.equal(competencyEarned(circularity, progress, {}), false);
  assert.equal(competencyEarned(diagnostics, progress, { a: 70, b: 88, c: 100 }), true);
});
