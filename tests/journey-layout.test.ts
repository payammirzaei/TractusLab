import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { journeyLayout, journeyMoments } from "../lib/journey-visuals.ts";
import { chapters } from "../lib/data-journey.ts";

test("the exchange fills wide, standard and phone canvases without clipping company networks", () => {
  for (const [width, height] of [[2000, 450], [980, 420], [640, 350], [350, 287], [300, 287]]) {
    const layout = journeyLayout(width / height);
    const camera = new PerspectiveCamera(40, width / height, .1, 1000);
    camera.position.set(0, 0, layout.distance); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const project = (x: number, y: number, z = 0) => new Vector3(x, y, z).project(camera);
    const a = layout.positions.provider[0], b = layout.positions.consumer[0];
    // Measurable regression for the screenshot: the companies no longer occupy only the central quarter.
    assert.ok(project(b, 0).x - project(a, 0).x > 1.2, `${width}px: companies too tightly clustered`);
    assert.ok(project(a - 1.8, 0).x > -.96, `${width}px: provider clipped`);
    assert.ok(project(b + 1.8, 0).x < .96, `${width}px: consumer clipped`);
    for (const [id, position] of Object.entries(layout.positions)) {
      const label = project(position[0], position[1] - (id === "provider" || id === "consumer" ? 1.95 : 1.05));
      assert.ok(Math.abs(label.y) < .9, `${width}px: ${id} label vertically clipped`);
    }
    const left = project(layout.positions.catalog[0], 0).x;
    const right = project(layout.positions.identity[0], 0).x;
    assert.ok((right - left) * width / 2 >= 74, `${width}px: compact labels overlap`);
  }
});

test("every chapter has its own memorable caption and milestone", () => {
  assert.equal(journeyMoments.length, chapters.length);
  assert.equal(new Set(journeyMoments.map(moment => moment.result)).size, chapters.length);
  assert.ok(journeyMoments[6].detail.includes("original remains"));
});
