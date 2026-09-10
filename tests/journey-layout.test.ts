import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { journeyLayout, journeyMoments } from "../lib/journey-visuals.ts";
import { chapters } from "../lib/data-journey.ts";

test("two company architectures stay visible and separated on wide, standard and phone canvases", () => {
  for (const [width, height] of [[2000, 450], [980, 420], [640, 350], [350, 287], [300, 287]]) {
    const layout = journeyLayout(width / height);
    const camera = new PerspectiveCamera(40, width / height, .1, 1000);
    camera.position.set(0, .25, layout.distance); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const project = (x: number, y: number, z = 0) => new Vector3(x, y, z).project(camera);
    const shellHalf = 2.05 * layout.companyScale;
    const leftEdge = project(-layout.companyX - shellHalf, 0, -.2);
    const rightEdge = project(layout.companyX + shellHalf, 0, .2);
    assert.ok(leftEdge.x > -.98, `${width}px: Company A clipped`);
    assert.ok(rightEdge.x < .98, `${width}px: Company B clipped`);
    const providerInner = project(-layout.companyX + shellHalf, 0, -.2).x;
    const consumerInner = project(layout.companyX - shellHalf, 0, .2).x;
    assert.ok(consumerInner - providerInner > .035, `${width}px: company shells overlap or leave no readable dataspace corridor`);
    const top = project(0, 3.55 * layout.companyScale, 0);
    const bottom = project(0, -3.05 * layout.companyScale, 0);
    assert.ok(top.y < .94 && bottom.y > -.94, `${width}px: company architecture vertically clipped`);
  }
});

test("desktop has authored depth while phones keep the stage restrained", () => {
  const desktop = journeyLayout(16 / 9);
  const phone = journeyLayout(9 / 16);
  const desktopDepths = new Set(Object.values(desktop.positions).map(([, , z]) => z));
  assert.ok(desktopDepths.size >= 5);
  assert.notEqual(desktop.positions.provider[2], desktop.positions.consumer[2]);
  assert.ok(Math.max(...Object.values(phone.positions).map(([, , z]) => Math.abs(z))) <= .45);
  assert.ok(phone.companyScale < desktop.companyScale);
});

test("each chapter has a distinct memory cue grounded in the corrected flow", () => {
  assert.equal(journeyMoments.length, chapters.length);
  assert.equal(new Set(journeyMoments.map(moment => moment.result)).size, chapters.length);
  assert.match(journeyMoments[2].detail, /DSP/i);
  assert.match(journeyMoments[3].detail, /access policy/i);
  assert.match(journeyMoments[6].detail, /EDR/i);
  assert.match(journeyMoments[6].detail, /original source/i);
});
