import test from "node:test";
import assert from "node:assert/strict";
import { deriveLearningJourney } from "../lib/learning-journey.ts";
import type { LearningProgress } from "../lib/progress.ts";

function flagship(overrides: Partial<LearningProgress["battery-pcf"]> = {}): LearningProgress {
  return {
    "battery-pcf": {
      maxStep: 0,
      completed: false,
      solvedChallenges: [],
      ...overrides,
    },
  };
}

test("learning journey starts at Discover", () => {
  const journey = deriveLearningJourney({}, {});
  assert.equal(journey.current, "discover");
  assert.equal(journey.percent, 0);
  assert.equal(journey.stages.find((stage) => stage.id === "discover")?.state, "current");
  assert.equal(journey.stages.find((stage) => stage.id === "learn")?.state, "locked");
});

test("starting the flagship scenario moves the learner to Learn", () => {
  const journey = deriveLearningJourney(flagship({ maxStep: 2 }), {});
  assert.equal(journey.current, "learn");
  assert.equal(journey.percent, 25);
  assert.equal(journey.stages.find((stage) => stage.id === "discover")?.state, "complete");
});

test("lesson completion unlocks Practice", () => {
  const journey = deriveLearningJourney(flagship({ maxStep: 7, completed: true }), {});
  assert.equal(journey.current, "practice");
  assert.equal(journey.percent, 50);
});

test("solving a lesson challenge moves the learner to Validate", () => {
  const journey = deriveLearningJourney(flagship({ maxStep: 7, completed: true, solvedChallenges: ["lesson-catalog-component"] }), {});
  assert.equal(journey.current, "validate");
  assert.equal(journey.percent, 75);
});

test("a flagship Boss score of 70 completes the five-stage journey", () => {
  const progress = flagship({ maxStep: 7, completed: true, solvedChallenges: ["lesson-catalog-component"] });
  const journey = deriveLearningJourney(progress, { "battery-pcf": 70 });
  assert.equal(journey.current, "complete");
  assert.equal(journey.percent, 100);
  assert.equal(journey.completedCount, 4);
  assert.equal(journey.stages.find((stage) => stage.id === "complete")?.state, "current");
});
