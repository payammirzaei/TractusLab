import test from "node:test";
import assert from "node:assert/strict";
import { achievements, coreScenarioIds } from "../data/achievements";
import {
  achievementEarned,
  learnerStats,
  masteryCertificateUnlocked,
  sanitizeLearnerName,
} from "../lib/profile";
import type { LearningProgress } from "../lib/progress";
import type { BossScores } from "../lib/boss";

function completeProgress(ids: string[]): LearningProgress {
  return Object.fromEntries(ids.map((id) => [id, { maxStep: 5, completed: true, solvedChallenges: [] }]));
}

test("achievement rules combine scenario and boss requirements", () => {
  const progress = completeProgress([...coreScenarioIds]);
  const scores: BossScores = { "battery-pcf": 91, "digital-twin": 82, traceability: 76 };
  const mastery = achievements.find((item) => item.id === "dataspace-master");
  assert.ok(mastery);
  assert.equal(achievementEarned(mastery, progress, scores), true);
  assert.equal(achievementEarned(mastery, progress, { "battery-pcf": 91 }), false);
});

test("certificate unlock requires all scenarios and three mastered bosses", () => {
  const progress = completeProgress([...coreScenarioIds]);
  assert.equal(masteryCertificateUnlocked(progress, { a: 70, b: 80, c: 90 }, [...coreScenarioIds]), true);
  const partial = completeProgress([...coreScenarioIds].slice(0, -1));
  assert.equal(masteryCertificateUnlocked(partial, { a: 70, b: 80, c: 90 }, [...coreScenarioIds]), false);
});

test("learner stats summarize progress and boss performance", () => {
  const progress = completeProgress(["battery-pcf", "digital-twin", "traceability"]);
  const stats = learnerStats(progress, { one: 100, two: 80, three: 60 }, achievements);
  assert.equal(stats.completedScenarios, 3);
  assert.equal(stats.masteredBosses, 2);
  assert.equal(stats.bestBossScore, 100);
  assert.equal(stats.averageBossScore, 80);
  assert.ok(stats.earnedAchievements >= 3);
});

test("learner name is normalized and bounded", () => {
  assert.equal(sanitizeLearnerName("  Payam    Mirzaei  "), "Payam Mirzaei");
  assert.equal(sanitizeLearnerName("x".repeat(100)).length, 60);
});
