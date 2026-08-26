import test from "node:test";
import assert from "node:assert/strict";

import { mergeBossScores, mergeProgress } from "../lib/server-sync";
import type { LearningProgress } from "../lib/progress";

test("server progress merge never loses local or remote evidence", () => {
  const local: LearningProgress = {
    "battery-pcf": { maxStep: 5, completed: false, solvedChallenges: ["policy"] },
  };
  const remote: LearningProgress = {
    "battery-pcf": { maxStep: 3, completed: true, solvedChallenges: ["identity"] },
    "digital-twin": { maxStep: 2, completed: false, solvedChallenges: [] },
  };

  const merged = mergeProgress(local, remote);
  assert.deepEqual(merged["battery-pcf"], {
    maxStep: 5,
    completed: true,
    solvedChallenges: ["identity", "policy"],
  });
  assert.deepEqual(merged["digital-twin"], remote["digital-twin"]);
});

test("server boss score merge keeps the best result", () => {
  assert.deepEqual(
    mergeBossScores({ "battery-pcf": 88, quality: 61 }, { "battery-pcf": 72, quality: 92 }),
    { "battery-pcf": 88, quality: 92 },
  );
});
