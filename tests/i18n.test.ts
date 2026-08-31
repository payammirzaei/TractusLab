import assert from "node:assert/strict";
import test from "node:test";
import { getScenarioById, learningScenarios, setCatalogLocale } from "../data/catalog";
import { competencies, curriculumMissions } from "../data/curriculum";
import { accountCopy } from "../lib/account-i18n";
import { translate } from "../lib/i18n";

const scenarioIds = [
  "battery-pcf",
  "digital-twin",
  "traceability",
  "demand-capacity",
  "quality-management",
  "circular-economy",
] as const;

test("UI messages translate to German and interpolate values", () => {
  assert.equal(translate("de", "nav.path"), "Lernpfad");
  assert.equal(translate("de", "learn.stepOf", { current: 2, total: 7 }), "Schritt 2 von 7");
  assert.equal(translate("de", "path.masterySnapshot"), "Kompetenzübersicht");
  assert.equal(translate("de", "timeline.correct"), "Richtig");
  assert.equal(translate("de", "map.provider"), "Datenanbieter");
  assert.equal(translate("en", "nav.path"), "Mission path");
});

test("guest account copy is available in English and German", () => {
  const english = accountCopy("en");
  const german = accountCopy("de");

  assert.equal(english.createAccount, "Create account");
  assert.equal(german.createAccount, "Konto erstellen");
  assert.equal(german.signIn, "Anmelden");
  assert.match(german.guestIntro, /Gast/);
  assert.equal(german.signals.minimum, "Mindestens 10 Zeichen");
  assert.notEqual(german.journeys.register[1], english.journeys.register[1]);
});

test("all demo scenarios localize without changing learning logic identifiers", () => {
  setCatalogLocale("en");
  const english = new Map(scenarioIds.map((id) => [id, structuredClone(getScenarioById(id))]));
  const scenarioCount = learningScenarios.length;

  setCatalogLocale("de");

  for (const id of scenarioIds) {
    const source = english.get(id);
    assert.ok(source);
    const german = getScenarioById(id);

    assert.notEqual(german.title, source.title, `${id} title should be localized`);
    assert.deepEqual(german.steps.map((step) => step.id), source.steps.map((step) => step.id));
    assert.deepEqual(german.challenges.map((challenge) => challenge.id), source.challenges.map((challenge) => challenge.id));
    assert.deepEqual(german.challenges.map((challenge) => challenge.correctOptionId), source.challenges.map((challenge) => challenge.correctOptionId));
    assert.equal(german.steps.length, source.steps.length);
    assert.equal(german.challenges.length, source.challenges.length);

    for (let index = 0; index < german.steps.length; index += 1) {
      assert.notEqual(german.steps[index].question, source.steps[index].question, `${id} step ${german.steps[index].id} question should be localized`);
      assert.notEqual(german.steps[index].business, source.steps[index].business, `${id} step ${german.steps[index].id} business copy should be localized`);
    }

    for (let index = 0; index < german.challenges.length; index += 1) {
      assert.notEqual(german.challenges[index].title, source.challenges[index].title, `${id} challenge ${german.challenges[index].id} should be localized`);
      assert.equal(german.challenges[index].options.length, source.challenges[index].options.length);
    }
  }

  assert.equal(learningScenarios.length, scenarioCount);
  setCatalogLocale("en");
});

test("quality curriculum mission and competency target the published quality scenario", () => {
  assert.equal(curriculumMissions.find((mission) => mission.id === "quality")?.scenarioId, "quality-management");
  assert.equal(competencies.find((competency) => competency.id === "quality-collaboration")?.scenarioId, "quality-management");
});
