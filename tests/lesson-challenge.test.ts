import test from "node:test";
import assert from "node:assert/strict";
import { getScenarioById } from "../data/catalog.ts";
import { evaluateLessonChallenge, type LessonChallenge } from "../lib/simulator.ts";

test("choice lesson challenge returns smart feedback", () => {
  const challenge: LessonChallenge = {
    id: "choice",
    kind: "multiple-choice",
    prompt: "Pick one",
    hint: "Think again",
    relevantConcept: "Policy",
    correctExplanation: "Correct",
    wrongExplanation: "Wrong",
    takeaway: "Remember policy",
    options: [
      { id: "a", label: "A", explanation: "A is wrong", concept: "Identity" },
      { id: "b", label: "B", explanation: "B is correct", concept: "Policy" },
    ],
    correctOptionIds: ["b"],
  };

  assert.deepEqual(evaluateLessonChallenge(challenge, "b"), {
    correct: true,
    explanation: "Correct",
    relevantConcept: "Policy",
    takeaway: "Remember policy",
  });
  assert.deepEqual(evaluateLessonChallenge(challenge, "a"), {
    correct: false,
    explanation: "A is wrong",
    relevantConcept: "Identity",
    takeaway: "Remember policy",
  });
});

test("workflow-order challenge validates the entire sequence", () => {
  const challenge: LessonChallenge = {
    id: "order",
    kind: "workflow-order",
    prompt: "Order it",
    hint: "Discovery first",
    relevantConcept: "Governed workflow",
    correctExplanation: "Correct order",
    wrongExplanation: "Wrong order",
    takeaway: "Discover then transfer",
    items: [
      { id: "discover", label: "Discover" },
      { id: "agreement", label: "Agreement" },
      { id: "transfer", label: "Transfer" },
    ],
    correctOrder: ["discover", "agreement", "transfer"],
  };

  assert.equal(evaluateLessonChallenge(challenge, ["discover", "agreement", "transfer"]).correct, true);
  assert.equal(evaluateLessonChallenge(challenge, ["transfer", "discover", "agreement"]).correct, false);
});

test("Battery PCF ships all five lesson challenge types", () => {
  const scenario = getScenarioById("battery-pcf");
  const kinds = new Set(scenario.steps.flatMap((step) => step.challenge ? [step.challenge.kind] : []));
  assert.deepEqual(
    [...kinds].sort(),
    ["architecture-select", "component-select", "multiple-choice", "scenario-decision", "workflow-order"].sort(),
  );
});

test("Battery PCF lessons expose simple explanation, visual hint, example and takeaway", () => {
  const scenario = getScenarioById("battery-pcf");
  for (const step of scenario.steps) {
    assert.ok(step.simpleExplanation?.trim(), `${step.id} needs simpleExplanation`);
    assert.ok(step.architectureHint?.trim(), `${step.id} needs architectureHint`);
    assert.ok(step.realWorldExample?.trim(), `${step.id} needs realWorldExample`);
    assert.ok(step.keyTakeaway?.trim(), `${step.id} needs keyTakeaway`);
  }
});
