import assert from "node:assert/strict";
import test from "node:test";
import { getScenarioById, learningScenarios, setCatalogLocale } from "../data/catalog";
import { translate } from "../lib/i18n";

test("UI messages translate to German and interpolate values", () => {
  assert.equal(translate("de", "nav.path"), "Lernpfad");
  assert.equal(translate("de", "learn.stepOf", { current: 2, total: 7 }), "Schritt 2 von 7");
  assert.equal(translate("en", "nav.path"), "Mission path");
});

test("scenario localization changes text without changing learning logic identifiers", () => {
  setCatalogLocale("en");
  const english = getScenarioById("battery-pcf");
  const englishStepIds = english.steps.map((step) => step.id);
  const englishChallengeIds = english.challenges.map((challenge) => challenge.id);
  const englishCorrectOptions = english.challenges.map((challenge) => challenge.correctOptionId);
  const scenarioCount = learningScenarios.length;

  setCatalogLocale("de");
  const german = getScenarioById("battery-pcf");

  assert.equal(german.shortTitle, "Batterie CO₂");
  assert.match(german.steps[0].question, /Warum/);
  assert.deepEqual(german.steps.map((step) => step.id), englishStepIds);
  assert.deepEqual(german.challenges.map((challenge) => challenge.id), englishChallengeIds);
  assert.deepEqual(german.challenges.map((challenge) => challenge.correctOptionId), englishCorrectOptions);
  assert.equal(learningScenarios.length, scenarioCount);

  setCatalogLocale("en");
  assert.equal(getScenarioById("battery-pcf").shortTitle, "Battery CO₂");
});
