import test from "node:test";
import assert from "node:assert/strict";
import { edcRouteForBeat } from "../lib/journey-edc-topology.ts";
import { journeySequences } from "../lib/journey-sequence.ts";

const controlPair = new Set(["provider-control", "consumer-control"]);

test("all cross-company control traffic is EDC-to-EDC, never company-to-company", () => {
  for (const chapter of [2, 3, 5, 6]) {
    for (const beat of journeySequences[chapter]) {
      const route = edcRouteForBeat(chapter, beat.id, beat.kind);
      if (route.mode !== "control" || route.points.length < 2) continue;
      assert.equal(controlPair.has(route.points[0]), true, `${chapter}/${beat.id}: control route must start at an EDC control plane`);
      assert.equal(controlPair.has(route.points.at(-1)!), true, `${chapter}/${beat.id}: control route must end at an EDC control plane`);
      assert.equal(route.points.includes("provider-system"), false);
      assert.equal(route.points.includes("consumer-system"), false);
    }
  }
});

test("catalogue request runs Consumer EDC to Provider EDC", () => {
  const route = edcRouteForBeat(3, "catalog-request", "control");
  assert.deepEqual(route.points, ["consumer-control", "provider-control"]);
  assert.match(route.label, /Consumer EDC.*Provider EDC/i);
});

test("EDR is exchanged in the EDC control plane", () => {
  const route = edcRouteForBeat(6, "transfer-start", "control");
  assert.equal(route.mode, "control");
  assert.deepEqual(route.points, ["provider-control", "consumer-control"]);
  assert.match(route.label, /EDR/i);
});

test("authorized fetch is data-plane connector to connector", () => {
  const route = edcRouteForBeat(6, "fetch", "retrieval");
  assert.equal(route.mode, "data");
  assert.deepEqual(route.points, ["consumer-data", "provider-data"]);
});

test("payload path visibly traverses source, Provider EDC, Consumer EDC, then Company B", () => {
  const route = edcRouteForBeat(6, "payload", "data");
  assert.equal(route.mode, "payload");
  assert.deepEqual(route.points, ["provider-source", "provider-data", "consumer-data", "consumer-system"]);
});

test("Company A source stays local before the payload beat", () => {
  for (let chapter = 0; chapter <= 6; chapter++) {
    for (const beat of journeySequences[chapter]) {
      if (chapter === 6 && beat.id === "payload") continue;
      const route = edcRouteForBeat(chapter, beat.id, beat.kind);
      const crossesFromSource = route.points[0] === "provider-source" && route.points.includes("consumer-system");
      assert.equal(crossesFromSource, false, `${chapter}/${beat.id}: source crossed too early`);
    }
  }
});
