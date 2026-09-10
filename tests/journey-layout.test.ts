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
    const project = (position: [number, number, number], dy = 0) => new Vector3(position[0], position[1] + dy, position[2]).project(camera);
    const provider = layout.positions.provider, consumer = layout.positions.consumer;
    // Measurable regression for the screenshot: the companies no longer occupy only the central quarter.
    assert.ok(project(consumer).x - project(provider).x > 1.15, `${width}px: companies too tightly clustered`);
    assert.ok(project([provider[0] - 1.8, provider[1], provider[2]]).x > -.97, `${width}px: provider clipped`);
    assert.ok(project([consumer[0] + 1.8, consumer[1], consumer[2]]).x < .97, `${width}px: consumer clipped`);
    for (const [id, position] of Object.entries(layout.positions)) {
      const label = project(position, id === "provider" || id === "consumer" ? -1.95 : -1.05);
      assert.ok(Math.abs(label.y) < .91, `${width}px: ${id} label vertically clipped`);
    }
    const left = project(layout.positions.catalog).x;
    const right = project(layout.positions.identity).x;
    assert.ok((right - left) * width / 2 >= 70, `${width}px: compact labels overlap`);
  }
});

test("desktop layout uses real depth while phone layouts keep depth restrained", () => {
  const desktop = journeyLayout(16 / 9);
  const phone = journeyLayout(9 / 16);
  const desktopDepths = new Set(Object.values(desktop.positions).map(([, , z]) => z));
  assert.ok(desktopDepths.size >= 5, "desktop nodes should occupy several depth planes");
  assert.notEqual(desktop.positions.provider[2], desktop.positions.consumer[2]);
  assert.ok(Math.max(...Object.values(phone.positions).map(([, , z]) => Math.abs(z))) <= .55, "phone depth should stay subtle");
});

test("every chapter has its own memorable caption and milestone", () => {
  assert.equal(journeyMoments.length, chapters.length);
  assert.equal(new Set(journeyMoments.map(moment => moment.result)).size, chapters.length);
  assert.ok(journeyMoments[6].detail.includes("original remains"));
});
