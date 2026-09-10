import test from "node:test";
import assert from "node:assert/strict";
import { chapters, faults, initialJourney, journeyReducer } from "../lib/data-journey.ts";
import { advanceJourneyProgress, journeySequences, sequenceFrame, sequenceWindows } from "../lib/journey-sequence.ts";

test("all eight chapters serialize every teaching beat and leave time to see the outcome", () => {
  assert.equal(journeySequences.length, chapters.length);
  for (let chapter = 0; chapter < chapters.length; chapter++) {
    const windows = sequenceWindows(chapter);
    assert.equal(new Set(windows.map(beat => beat.id)).size, windows.length);
    for (let i = 0; i < windows.length; i++) {
      assert.ok(windows[i].end > windows[i].start);
      if (i) assert.ok(windows[i].start > windows[i - 1].end);
    }
    assert.ok(windows.at(-1)!.end < .91);
    for (let tick = 0; tick <= 1000; tick++) {
      const frame = sequenceFrame(chapter, tick / 1000);
      assert.ok(frame.beats.filter(beat => beat.status === "active").length <= 1);
      frame.beats.forEach((beat, index) => {
        if (beat.status === "active" || beat.status === "done") assert.ok(frame.beats.slice(0, index).every(prior => prior.status === "done"), `${beat.id} started before its predecessors`);
      });
    }
    assert.ok(sequenceFrame(chapter, 1).finished);
    assert.ok(!sequenceFrame(chapter, 1).beats.some(beat => beat.status === "active"));
  }
});

test("DSP connector discovery completes before the catalogue chapter begins", () => {
  const ids = sequenceWindows(2).map(beat => beat.id);
  assert.deepEqual(ids, ["find-provider", "version-request", "version-response", "endpoint-ready"]);
  const request = sequenceWindows(2).find(beat => beat.id === "version-request")!;
  const response = sequenceWindows(2).find(beat => beat.id === "version-response")!;
  assert.equal(request.from, "consumer"); assert.equal(request.to, "provider");
  assert.equal(response.from, "provider"); assert.equal(response.to, "consumer");
  assert.equal(sequenceFrame(2, 1).connectorReady, true);
  assert.equal(journeySequences[3][0].id, "catalog-request");
});

test("catalogue response waits for credential and access-policy checks", () => {
  const windows = sequenceWindows(3);
  assert.deepEqual(windows.map(beat => beat.id), ["catalog-request", "credential-check", "access-check", "catalog-response", "offer-found"]);
  const request = windows.find(beat => beat.id === "catalog-request")!;
  const credentials = windows.find(beat => beat.id === "credential-check")!;
  const access = windows.find(beat => beat.id === "access-check")!;
  const response = windows.find(beat => beat.id === "catalog-response")!;
  assert.equal(request.from, "consumer"); assert.equal(request.to, "provider");
  assert.equal(credentials.fault, "identity");
  assert.equal(response.from, "provider"); assert.equal(response.to, "consumer");
  assert.ok(request.end < credentials.start && credentials.end < access.start && access.end < response.start);
  assert.equal(sequenceFrame(3, response.start - .0001).catalogReady, false);
  assert.equal(sequenceFrame(3, response.end).catalogReady, true);
  assert.equal(sequenceFrame(3, response.end).copyVisible, false);
});

test("offer selection does not pretend that provider usage policy is already accepted", () => {
  assert.deepEqual(sequenceWindows(4).map(beat => beat.id), ["review-offer", "compare-purpose", "select-offer"]);
  assert.equal(sequenceFrame(4, 1).agreementReady, false);
  assert.equal(sequenceFrame(4, 1).policyMatched, false);
});

test("usage policy is evaluated during negotiation before agreement and finalization", () => {
  const windows = sequenceWindows(5);
  assert.deepEqual(windows.map(beat => beat.id), ["contract-request", "contract-policy-check", "contract-agreement", "contract-verification", "contract-finalized", "seal"]);
  const policy = windows.find(beat => beat.id === "contract-policy-check")!;
  const agreement = windows.find(beat => beat.id === "contract-agreement")!;
  const finalized = windows.find(beat => beat.id === "contract-finalized")!;
  assert.equal(policy.fault, "policy");
  assert.ok(policy.end < agreement.start);
  assert.equal(sequenceFrame(5, policy.end).policyMatched, true);
  assert.equal(sequenceFrame(5, finalized.end - .0001).agreementReady, false);
  assert.equal(sequenceFrame(5, finalized.end).agreementReady, true);
  assert.equal(sequenceFrame(5, 1).copyVisible, false);
});

test("transfer STARTED/EDR happens before authorized fetch and payload delivery", () => {
  const windows = sequenceWindows(6);
  assert.deepEqual(windows.map(beat => beat.id), ["transfer-request", "authorize-transfer", "transfer-start", "edr-ready", "fetch", "read-source", "payload"]);
  const start = windows.find(beat => beat.id === "transfer-start")!;
  const fetch = windows.find(beat => beat.id === "fetch")!;
  const read = windows.find(beat => beat.id === "read-source")!;
  const payload = windows.find(beat => beat.id === "payload")!;
  assert.ok(start.end < fetch.start && fetch.end < read.start && read.end < payload.start);
  assert.equal(sequenceFrame(6, start.end - .0001).edrReady, false);
  assert.equal(sequenceFrame(6, start.end).edrReady, true);
  assert.equal(fetch.kind, "retrieval"); assert.equal(fetch.from, "consumer"); assert.equal(fetch.to, "provider");
  assert.equal(payload.kind, "data"); assert.equal(payload.from, "provider"); assert.equal(payload.to, "consumer");
  assert.equal(sequenceFrame(6, payload.start - .0001).copyVisible, false);
  assert.equal(sequenceFrame(6, payload.start).copyVisible, true);
  assert.equal(sequenceFrame(6, payload.end).copyDelivered, true);
});

test("use begins with the delivered copy and never starts a second transfer", () => {
  assert.ok(journeySequences[7].every(beat => !beat.from && !beat.to));
  const use = sequenceWindows(7).find(beat => beat.id === "use-record")!;
  assert.equal(sequenceFrame(7, 0).copyDelivered, true);
  assert.equal(sequenceFrame(7, 0).edrReady, true);
  assert.equal(sequenceFrame(7, use.end - .0001).consumerActivated, false);
  assert.equal(sequenceFrame(7, use.end).consumerActivated, true);
});

test("failure snapshots freeze at the real check and never show impossible future state", () => {
  for (const fault of ["identity", "policy", "offline"] as const) {
    const chapter = faults[fault].chapter;
    const frame = sequenceFrame(chapter, .9, fault);
    assert.equal(frame.current.status, "blocked");
    assert.equal(frame.current.fault, fault);
    assert.equal(frame.finished, false);
    assert.equal(frame.copyVisible, false);
    assert.equal(frame.copyDelivered, false);
    if (fault === "identity") { assert.equal(frame.catalogReady, false); assert.equal(frame.agreementReady, false); }
    if (fault === "policy") assert.equal(frame.agreementReady, false);
    if (fault === "offline") { assert.equal(frame.agreementReady, true); assert.equal(frame.edrReady, true); }
    const index = frame.beats.indexOf(frame.current);
    assert.ok(frame.beats.slice(index + 1).every(beat => beat.status === "upcoming"));
    const failed = journeyReducer(initialJourney, { type: "fault", fault });
    const repaired = journeyReducer(failed, { type: "repair" });
    assert.notEqual(repaired.replay, failed.replay);
    assert.ok(sequenceFrame(chapter, 0, repaired.fault).beats.every(beat => beat.status === "upcoming"));
  }
});

test("pause and speed changes cannot skip prerequisites", () => {
  for (const speed of [.5, 1, 1.5]) {
    let progress = 0;
    for (let tick = 0; tick < 1700; tick++) {
      const paused = tick >= 100 && tick < 200;
      const next = advanceJourneyProgress(progress, 1 / 45, chapters[6].duration, speed, paused);
      if (paused) assert.equal(next, progress);
      const frame = sequenceFrame(6, next);
      if (frame.copyVisible) {
        assert.equal(frame.edrReady, true);
        assert.ok(frame.beats.slice(0, -1).every(beat => beat.status === "done"));
      }
      progress = next;
    }
    assert.ok(progress <= 1);
  }
  assert.equal(advanceJourneyProgress(.4, 500, 10, 1, true), .4);
  assert.equal(advanceJourneyProgress(.4, 500, 10, 1, false), .42500000000000004);
});

test("direct chapter navigation assumes completed earlier chapters but never future events", () => {
  for (let chapter = 0; chapter < chapters.length; chapter++) {
    const frame = sequenceFrame(chapter, 0);
    assert.equal(frame.finished, false);
    assert.equal(frame.connectorReady, chapter > 2);
    assert.equal(frame.catalogReady, chapter > 3);
    assert.equal(frame.agreementReady, chapter > 5);
    assert.equal(frame.edrReady, chapter > 6);
    assert.equal(frame.copyDelivered, chapter > 6);
    assert.ok(frame.beats.every(beat => beat.status === "upcoming"));
  }
});
