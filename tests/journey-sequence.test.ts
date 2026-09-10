import test from "node:test";
import assert from "node:assert/strict";
import { chapters, faults, initialJourney, journeyReducer } from "../lib/data-journey.ts";
import { advanceJourneyProgress, journeySequences, sequenceFrame, sequenceWindows } from "../lib/journey-sequence.ts";

test("all eight chapters serialize every action and leave time to see the outcome", () => {
  assert.equal(journeySequences.length, chapters.length);
  for (let chapter = 0; chapter < chapters.length; chapter++) {
    const windows = sequenceWindows(chapter);
    assert.equal(new Set(windows.map(beat => beat.id)).size, windows.length);
    for (let i = 0; i < windows.length; i++) {
      assert.ok(windows[i].end > windows[i].start);
      if (i) assert.ok(windows[i].start > windows[i - 1].end);
    }
    assert.ok(windows.at(-1)!.end < .9);
    for (let tick = 0; tick <= 1000; tick++) {
      const frame = sequenceFrame(chapter, tick / 1000);
      assert.ok(frame.beats.filter(beat => beat.status === "active").length <= 1);
      frame.beats.forEach((beat, index) => {
        if (beat.status === "active" || beat.status === "done") {
          assert.ok(frame.beats.slice(0, index).every(prior => prior.status === "done"), `${beat.id} started before its predecessors`);
        }
      });
    }
    assert.ok(sequenceFrame(chapter, 1).finished);
    assert.ok(!sequenceFrame(chapter, 1).beats.some(beat => beat.status === "active"), "completed messages must not loop");
  }
});

test("catalogue response cannot start until the consumer request arrives and access is checked", () => {
  const windows = sequenceWindows(2);
  const request = windows.find(beat => beat.id === "catalog-request")!;
  const check = windows.find(beat => beat.id === "catalog-check")!;
  const response = windows.find(beat => beat.id === "catalog-response")!;
  assert.equal(request.from, "consumer");
  assert.equal(request.to, "catalog");
  assert.equal(response.from, "catalog");
  assert.equal(response.to, "consumer");
  assert.ok(request.end < check.start && check.end < response.start);
  for (const time of [request.start, (request.start + request.end) / 2, request.end, check.end, response.start - .0001]) {
    const frame = sequenceFrame(2, time);
    assert.equal(frame.beats.find(beat => beat.id === response.id)!.status, "upcoming");
    assert.equal(frame.copyVisible, false);
  }
});

test("agreement is sealed only after request, agreement, verification and finalization", () => {
  const windows = sequenceWindows(5);
  assert.deepEqual(windows.filter(beat => beat.from).map(beat => [beat.id, beat.from, beat.to]), [
    ["contract-request", "consumer", "provider"],
    ["contract-agreement", "provider", "consumer"],
    ["contract-verification", "consumer", "provider"],
    ["contract-finalized", "provider", "consumer"],
  ]);
  const finalized = windows.find(beat => beat.id === "contract-finalized")!;
  assert.equal(sequenceFrame(5, finalized.end - .0001).agreementReady, false);
  assert.equal(sequenceFrame(5, finalized.end).agreementReady, true);
  assert.equal(sequenceFrame(5, 1).copyVisible, false);
});

test("HTTP pull returns access information before fetching and reads the source before delivering", () => {
  const windows = sequenceWindows(6);
  assert.deepEqual(windows.map(beat => beat.id), ["transfer-request", "authorize-transfer", "transfer-ready", "fetch", "read-source", "payload"]);
  const payload = windows.at(-1)!;
  const fetch = windows.find(beat => beat.id === "fetch")!;
  assert.equal(fetch.kind, "retrieval");
  assert.equal(fetch.from, "consumer");
  assert.equal(payload.kind, "data");
  assert.equal(payload.from, "provider");
  assert.equal(sequenceFrame(6, payload.start - .0001).copyVisible, false);
  assert.equal(sequenceFrame(6, payload.start).copyVisible, true);
  assert.equal(sequenceFrame(6, payload.end - .0001).copyDelivered, false);
  assert.equal(sequenceFrame(6, payload.end).copyDelivered, true);
});

test("use starts with a delivered copy and activates the consumer only after interpretation and use", () => {
  assert.ok(journeySequences[7].every(beat => !beat.from && !beat.to));
  const use = sequenceWindows(7).find(beat => beat.id === "use-record")!;
  assert.equal(sequenceFrame(7, 0).copyDelivered, true);
  assert.equal(sequenceFrame(7, use.end - .0001).consumerActivated, false);
  assert.equal(sequenceFrame(7, use.end).consumerActivated, true);
});

test("failure snapshots never show later events or false success, and repair restarts from zero", () => {
  for (const fault of ["identity", "policy", "offline"] as const) {
    const chapter = faults[fault].chapter;
    for (const progress of [0, .5, 1]) {
      const frame = sequenceFrame(chapter, progress, fault);
      assert.equal(frame.current.status, "blocked");
      assert.equal(frame.current.fault, fault);
      assert.equal(frame.finished, false);
      assert.equal(frame.copyVisible, false);
      assert.equal(frame.copyDelivered, false);
      assert.equal(frame.identityVerified, false);
      assert.equal(frame.policyMatched, false);
      assert.equal(frame.agreementReady, fault === "offline");
      const index = frame.beats.indexOf(frame.current);
      assert.ok(frame.beats.slice(index + 1).every(beat => beat.status === "upcoming"));
    }
    const failed = journeyReducer(initialJourney, { type: "fault", fault });
    const repaired = journeyReducer(failed, { type: "repair" });
    assert.notEqual(repaired.replay, failed.replay);
    assert.ok(sequenceFrame(chapter, 0, repaired.fault).beats.every(beat => beat.status === "upcoming"));
  }
});

test("pause and hidden-page suspension preserve positions; speed changes cannot skip prerequisites", () => {
  for (const speed of [.5, 1, 1.5]) {
    let progress = 0;
    for (let tick = 0; tick < 1500; tick++) {
      const paused = tick >= 100 && tick < 200;
      const next = advanceJourneyProgress(progress, 1 / 45, chapters[6].duration, speed, paused);
      if (paused) assert.equal(next, progress);
      const frame = sequenceFrame(6, next);
      if (frame.copyVisible) assert.ok(frame.beats.slice(0, -1).every(beat => beat.status === "done"));
      progress = next;
    }
    assert.ok(progress <= 1);
  }
  assert.equal(advanceJourneyProgress(.4, 500, 10, 1, true), .4);
  assert.equal(advanceJourneyProgress(.4, 500, 10, 1, false), .42500000000000004);
});

test("direct chapter navigation assumes earlier chapters, but never its own future events", () => {
  for (let chapter = 0; chapter < chapters.length; chapter++) {
    const frame = sequenceFrame(chapter, 0);
    assert.equal(frame.finished, false);
    assert.equal(frame.agreementReady, chapter > 5);
    assert.equal(frame.copyDelivered, chapter > 6);
    assert.ok(frame.beats.every(beat => beat.status === "upcoming"));
  }
});
