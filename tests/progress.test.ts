import test from "node:test";
import assert from "node:assert/strict";
import {
  markChallengeSolved,
  parseProgress,
  scenarioCompletionPercent,
  updateStepProgress,
} from "../lib/progress.ts";

test("local progress never moves backwards", () => {
  let progress = {};
  progress = updateStepProgress(progress, "battery-pcf", 3, 5);
  progress = updateStepProgress(progress, "battery-pcf", 1, 5);

  assert.equal(progress["battery-pcf"].maxStep, 3);
  assert.equal(scenarioCompletionPercent(progress, "battery-pcf", 5), 60);
});

test("scenario completion remains complete after restart", () => {
  let progress = {};
  progress = updateStepProgress(progress, "battery-pcf", 5, 5);
  progress = updateStepProgress(progress, "battery-pcf", 0, 5);

  assert.equal(progress["battery-pcf"].completed, true);
  assert.equal(scenarioCompletionPercent(progress, "battery-pcf", 5), 100);
});

test("solved challenge tracking is idempotent", () => {
  let progress = {};
  progress = markChallengeSolved(progress, "battery-pcf", "policy-mismatch");
  progress = markChallengeSolved(progress, "battery-pcf", "policy-mismatch");

  assert.deepEqual(progress["battery-pcf"].solvedChallenges, ["policy-mismatch"]);
});

test("stored progress parsing fails closed", () => {
  assert.deepEqual(parseProgress(null), {});
  assert.deepEqual(parseProgress("{bad"), {});
  assert.deepEqual(parseProgress("[]"), {});

  const parsed = parseProgress('{"battery-pcf":{"maxStep":2,"completed":false,"solvedChallenges":[]}}');
  assert.equal(parsed["battery-pcf"].maxStep, 2);
});
