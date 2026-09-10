import test from "node:test";
import assert from "node:assert/strict";
import { directJourneyScene } from "../lib/journey-director.ts";
import { journeySequences } from "../lib/journey-sequence.ts";

test("director never invents protocol beats and keeps each frame visually sparse", () => {
  journeySequences.forEach((beats, chapter) => {
    beats.forEach(beat => {
      const scene = directJourneyScene(chapter, beat.id, beat.kind);
      assert.ok(scene.artifacts.length <= 2, `${chapter}/${beat.id}: too many simultaneous semantic objects`);
      assert.ok(["provider", "consumer", "both"].includes(scene.actor));
      assert.ok(["wide", "provider", "consumer", "center", "control", "data"].includes(scene.camera));
    });
  });
});

test("catalogue chapter teaches ask prove filter return see in that order", () => {
  const beats = journeySequences[3];
  const expected = ["Ask", "Prove", "Filter", "Return", "See"];
  beats.forEach((beat, index) => {
    const scene = directJourneyScene(3, beat.id, beat.kind);
    assert.deepEqual(scene.rail?.labels, expected);
    assert.equal(scene.rail?.active, index);
  });
});

test("usage choice stays consumer-side and does not imply provider approval", () => {
  for (const beat of journeySequences[4]) {
    const scene = directJourneyScene(4, beat.id, beat.kind);
    assert.equal(scene.actor, "consumer");
    assert.equal(scene.camera, "consumer");
    const usage = scene.artifacts.find(item => item.id === "usage");
    assert.ok(usage);
    if (beat.id === "select-offer") assert.match(usage!.detail, /not approved yet/i);
  }
});

test("agreement is the hero only after provider policy evaluation", () => {
  const before = directJourneyScene(5, "contract-policy-check", "local");
  assert.equal(before.artifacts.some(item => item.id === "agreement"), false);
  assert.equal(before.artifacts.some(item => item.id === "usage"), true);

  for (const id of ["contract-agreement", "contract-verification", "contract-finalized", "seal"]) {
    const beat = journeySequences[5].find(item => item.id === id)!;
    const scene = directJourneyScene(5, id, beat.kind);
    assert.equal(scene.artifacts.some(item => item.id === "agreement" && item.emphasis === "hero"), true);
  }
});

test("transfer visibly separates EDR from payload and shifts to the data lane only for data access", () => {
  const edr = directJourneyScene(6, "transfer-start", "control");
  assert.equal(edr.lane, "control");
  assert.equal(edr.artifacts[0]?.id, "edr");
  assert.match(edr.artifacts[0]?.detail ?? "", /not the payload/i);

  const fetch = directJourneyScene(6, "fetch", "retrieval");
  assert.equal(fetch.lane, "data");
  assert.equal(fetch.camera, "data");
  assert.equal(fetch.artifacts.some(item => item.id === "payload"), false);

  const payload = directJourneyScene(6, "payload", "data");
  assert.equal(payload.lane, "data");
  assert.equal(payload.artifacts[0]?.id, "payload");
  assert.match(payload.artifacts[0]?.detail ?? "", /only now/i);
});
