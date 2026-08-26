import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBossFightScore,
  newcomerExplanation,
  parseBossScores,
  saveBestBossScore,
  type BossScores,
} from "../lib/boss";
import type { ScenarioStep } from "../lib/simulator";

test("boss fight scoring rewards clean diagnosis", () => {
  assert.deepEqual(calculateBossFightScore(0, 0), {
    score: 100,
    grade: "S",
    wrongAttempts: 0,
    hintsUsed: 0,
  });
  assert.equal(calculateBossFightScore(1, 0).score, 88);
  assert.equal(calculateBossFightScore(0, 1).score, 82);
  assert.equal(calculateBossFightScore(2, 1).grade, "B");
});

test("boss score is clamped and cannot become negative", () => {
  assert.equal(calculateBossFightScore(99, 99).score, 25);
  assert.equal(calculateBossFightScore(-3, -2).score, 100);
});

test("best boss score only moves upward", () => {
  let scores: BossScores = {};
  scores = saveBestBossScore(scores, "battery-pcf", 72);
  scores = saveBestBossScore(scores, "battery-pcf", 61);
  assert.equal(scores["battery-pcf"], 72);
  scores = saveBestBossScore(scores, "battery-pcf", 94);
  assert.equal(scores["battery-pcf"], 94);
});

test("boss score parsing rejects invalid storage", () => {
  assert.deepEqual(parseBossScores(null), {});
  assert.deepEqual(parseBossScores("{bad"), {});
  assert.deepEqual(parseBossScores("[]"), {});
  assert.deepEqual(parseBossScores('{"battery-pcf":120,"digital-twin":84.4,"bad":"x"}'), {
    "battery-pcf": 100,
    "digital-twin": 84,
  });
});

test("newcomer explanation uses business language", () => {
  const step: ScenarioStep = {
    id: "identity",
    technicalName: "Identity & Trust",
    question: "Who is asking?",
    business: "The supplier first checks which company is asking before sharing anything.",
    architecture: "Architecture text",
    developer: "Developer text",
    whyNeeded: "Why",
    withoutIt: "Without",
    actionLabel: "Continue",
    direction: "manufacturer-to-supplier",
    mapFocus: ["identity"],
    glossary: ["Identity"],
  };
  assert.equal(newcomerExplanation(step), step.business);
});
