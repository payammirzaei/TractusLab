import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const scene = fs.readFileSync(new URL("../components/journey/EdcJourneySceneV2.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../components/journey/edc-scene.module.css", import.meta.url), "utf8");
const journey = fs.readFileSync(new URL("../components/journey/DataJourney.tsx", import.meta.url), "utf8");
const journeyCss = fs.readFileSync(new URL("../components/journey/journey.module.css", import.meta.url), "utf8");
const stage = fs.readFileSync(new URL("../components/journey/journey-stage-effects.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/journey/page.tsx", import.meta.url), "utf8");

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

test("immersive journey composition uses film title and record character", () => {
  assert.match(journey, /filmTitle/);
  assert.match(journey, /recordChip/);
  assert.match(journey, /BAT-204/);
  assert.match(journey, /data-mode/);
  assert.match(journey, /Guided/);
  assert.doesNotMatch(journey, /signalReadout/);
  assert.doesNotMatch(journey, /LearnerNav/);
  assert.match(journeyCss, /\.filmTitle/);
  assert.match(journeyCss, /\.recordChip/);
  assert.match(page, /Syne/);
  assert.match(page, /IBM_Plex_Sans/);
});

test("stage hard-dims inactive topology and keeps artifact residue", () => {
  assert.match(scene, /residue/);
  assert.match(scene, /dataset\.lens/);
  assert.match(css, /data-lens/);
});

test("business systems stay secondary to EDC actors", () => {
  assert.match(css, /businessActor[\s\S]*opacity:\.45/);
  assert.match(css, /edcActor[\s\S]*border:1px solid rgba\(121,215,255,\.42\)/);
});

test("signal readout names EDC actors for control-plane routes", () => {
  assert.match(journey, /Provider EDC/);
  assert.match(journey, /Consumer EDC/);
});

test("floor focus ring follows the hero topology slot", () => {
  assert.match(stage, /focusRing\.position\.x = o\.hero\.position\.x/);
  assert.match(stage, /focusRing\.position\.z = o\.hero\.position\.z/);
});
