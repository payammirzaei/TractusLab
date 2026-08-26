import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateChallenge,
  isScenarioComplete,
  nextStepIndex,
  previousStepIndex,
  progressPercent,
  validateScenario,
  type Challenge,
  type LearningScenario,
} from "../lib/simulator.ts";
import { getScenarioById, learningScenarios, scenarioCount } from "../data/catalog.ts";

test("progressPercent clamps values and reaches 100", () => {
  assert.equal(progressPercent(0, 5), 0);
  assert.equal(progressPercent(2, 5), 40);
  assert.equal(progressPercent(5, 5), 100);
  assert.equal(progressPercent(99, 5), 100);
  assert.equal(progressPercent(-2, 5), 0);
  assert.equal(progressPercent(0, 0), 100);
});

test("step navigation respects boundaries", () => {
  assert.equal(nextStepIndex(0, 3), 1);
  assert.equal(nextStepIndex(3, 3), 3);
  assert.equal(previousStepIndex(0), 0);
  assert.equal(previousStepIndex(2), 1);
  assert.equal(isScenarioComplete(2, 3), false);
  assert.equal(isScenarioComplete(3, 3), true);
});

test("challenge evaluation returns correctness and selected explanation", () => {
  const challenge: Challenge = {
    id: "policy",
    title: "Policy mismatch",
    prompt: "What failed?",
    symptom: "Negotiation failed",
    hint: "Check the rules",
    correctOptionId: "policy",
    rootCause: "Constraint mismatch",
    options: [
      { id: "policy", label: "Policy", explanation: "Correct explanation" },
      { id: "dns", label: "DNS", explanation: "Wrong explanation" },
    ],
  };

  assert.deepEqual(evaluateChallenge(challenge, "policy"), { correct: true, explanation: "Correct explanation" });
  assert.deepEqual(evaluateChallenge(challenge, "dns"), { correct: false, explanation: "Wrong explanation" });
  assert.equal(evaluateChallenge(challenge, "missing").correct, false);
});

test("scenario validation catches structural content problems", () => {
  const scenario: LearningScenario = {
    id: "demo",
    title: "Demo",
    shortTitle: "Demo",
    useCase: "Test",
    asset: "A-1",
    goal: "Test",
    supplierLabel: "Supplier",
    manufacturerLabel: "Manufacturer",
    steps: [
      {
        id: "same",
        technicalName: "One",
        question: "Question",
        business: "Business",
        architecture: "Architecture",
        developer: "Developer",
        whyNeeded: "Why",
        withoutIt: "Without",
        actionLabel: "Go",
        direction: "both",
        mapFocus: ["dataspace"],
        glossary: [],
      },
      {
        id: "same",
        technicalName: "Two",
        question: "Question",
        business: "",
        architecture: "Architecture",
        developer: "Developer",
        whyNeeded: "Why",
        withoutIt: "Without",
        actionLabel: "Go",
        direction: "both",
        mapFocus: ["dataspace"],
        glossary: [],
      },
    ],
    challenges: [
      {
        id: "broken",
        title: "Broken",
        prompt: "Prompt",
        symptom: "Symptom",
        hint: "Hint",
        correctOptionId: "not-present",
        rootCause: "Root",
        options: [{ id: "other", label: "Other", explanation: "No" }],
      },
    ],
  };

  const errors = validateScenario(scenario);
  assert.ok(errors.includes("Duplicate step id: same"));
  assert.ok(errors.includes("Step same must define all three learning depths."));
  assert.ok(errors.includes("Challenge broken has no matching correct option."));
});

test("shipped learning scenarios satisfy structural validation", () => {
  for (const scenario of learningScenarios) {
    assert.deepEqual(validateScenario(scenario), [], scenario.id);
  }
});

test("scenario catalog has unique ids and safe fallback behavior", () => {
  assert.equal(scenarioCount(), 6);
  assert.equal(new Set(learningScenarios.map((scenario) => scenario.id)).size, learningScenarios.length);
  assert.equal(getScenarioById("traceability").id, "traceability");
  assert.equal(getScenarioById("demand-capacity").id, "demand-capacity");
  assert.equal(getScenarioById("quality-management").id, "quality-management");
  assert.equal(getScenarioById("circular-economy").id, "circular-economy");
  assert.equal(getScenarioById("missing-scenario").id, learningScenarios[0].id);
});

test("every shipped scenario contains learning and diagnostic content", () => {
  for (const scenario of learningScenarios) {
    assert.ok(scenario.steps.length >= 5, `${scenario.id} should have at least five steps`);
    assert.ok(scenario.challenges.length >= 2, `${scenario.id} should have at least two challenges`);
    for (const step of scenario.steps) {
      assert.ok(step.question.trim().length > 10, `${scenario.id}/${step.id} needs a real question`);
      assert.ok(step.whyNeeded.trim().length > 10, `${scenario.id}/${step.id} needs a why-needed explanation`);
      assert.ok(step.withoutIt.trim().length > 10, `${scenario.id}/${step.id} needs a skip consequence`);
    }
  }
});

test("quality and circularity scenarios expose distinct diagnostic failures", () => {
  const quality = getScenarioById("quality-management");
  const circularity = getScenarioById("circular-economy");

  assert.ok(quality.challenges.some((challenge) => challenge.id.includes("policy")));
  assert.ok(quality.challenges.some((challenge) => challenge.id.includes("schema")));
  assert.ok(circularity.challenges.some((challenge) => challenge.id.includes("passport")));
  assert.ok(circularity.challenges.some((challenge) => challenge.id.includes("model")));
});
