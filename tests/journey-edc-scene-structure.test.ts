import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const scene = fs.readFileSync(new URL("../components/journey/EdcJourneySceneV2.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../components/journey/edc-scene.module.css", import.meta.url), "utf8");
const journey = fs.readFileSync(new URL("../components/journey/DataJourney.tsx", import.meta.url), "utf8");
const journeyCss = fs.readFileSync(new URL("../components/journey/journey.module.css", import.meta.url), "utf8");
const stage = fs.readFileSync(new URL("../components/journey/journey-stage-effects.ts", import.meta.url), "utf8");

test("EDC scene keeps Tractus-X connectors as named primary actors", () => {
  assert.match(scene, /Provider EDC/);
  assert.match(scene, /Consumer EDC/);
  assert.doesNotMatch(scene, /TRACTUS-X EDC/);
});

test("EDC scene keeps heroes on topology homes instead of a center stage teleport", () => {
  assert.doesNotMatch(scene, /focusHome/);
  assert.match(scene, /artifacts\[id\]\.group\.position\.copy\(homes\[id\]\)/);
  assert.match(scene, /aimCamera\(/);
  assert.match(scene, /Keep the corridor readable/);
});

test("journey scene supports constrained mouse look-around", () => {
  assert.match(scene, /orbit\.yaw/);
  assert.match(scene, /setFromSpherical/);
  assert.match(scene, /Drag to look/);
  assert.match(css, /cursor:grab/);
  assert.match(css, /touch-action:none/);
});

test("actor labels and hero callout are projected from world positions", () => {
  assert.match(scene, /placeLabel\(/);
  assert.match(scene, /placeCallout\(/);
  assert.match(scene, /Dock outside the model corridor/);
  assert.match(css, /\.actorStrip\s*\{[\s\S]*inset:0/);
  assert.match(css, /data-dock/);
});

test("stage declutter keeps one signal and hides redundant chrome", () => {
  assert.match(journey, /Guided/);
  assert.doesNotMatch(journey, /> Explore</);
  assert.doesNotMatch(journey, /FEDERATED DATASPACE/);
  assert.doesNotMatch(journey, /sceneCaption/);
  assert.doesNotMatch(journey, /simulationBadge/);
  assert.match(journey, /sequence\.position >= 0\.62/);
  assert.match(scene, /HERO_CALLOUT_IDS/);
  assert.match(scene, /chapter < 6\) return null/);
  assert.match(journeyCss, /\.sceneCaption,\.legend,\.simulationBadge\s*\{\s*display:none/);
});

test("business systems stay secondary to EDC actors", () => {
  assert.match(css, /businessActor[\s\S]*opacity:\.45/);
  assert.match(css, /edcActor[\s\S]*border:1px solid rgba\(121,215,255,\.42\)/);
});

test("signal readout names EDC actors for control-plane routes", () => {
  assert.match(journey, /Provider EDC/);
  assert.match(journey, /Consumer EDC/);
  assert.doesNotMatch(css, /aria-live="polite"\]\[aria-atomic="true"\] > small/);
});

test("floor focus ring follows the hero topology slot", () => {
  assert.match(stage, /focusRing\.position\.x = o\.hero\.position\.x/);
  assert.match(stage, /focusRing\.position\.z = o\.hero\.position\.z/);
});
