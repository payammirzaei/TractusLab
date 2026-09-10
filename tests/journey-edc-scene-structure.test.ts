import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const scene = fs.readFileSync(new URL("../components/journey/EdcJourneySceneV2.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../components/journey/edc-scene.module.css", import.meta.url), "utf8");

test("EDC scene keeps Tractus-X connectors as named primary actors", () => {
  assert.match(scene, /TRACTUS-X EDC/);
  assert.match(scene, /Provider EDC/);
  assert.match(scene, /Consumer EDC/);
  assert.match(scene, /TRACTUS-X DATASPACE/);
});

test("EDC scene uses a stable centered camera instead of chapter side-panning", () => {
  assert.match(scene, /camera\.position\.set\(pointer\.x \* \.05/);
  assert.doesNotMatch(scene, /cameraTarget\.set\(-/);
  assert.doesNotMatch(scene, /cameraTarget\.set\(span/);
});

test("business systems stay secondary to EDC actors", () => {
  assert.match(css, /businessActor[\s\S]*opacity:\.45/);
  assert.match(css, /edcActor[\s\S]*border:1px solid rgba\(121,215,255,\.42\)/);
});

test("legacy company-to-company direction subline is suppressed", () => {
  assert.match(css, /aria-live="polite"\]\[aria-atomic="true"\] > small/);
});
