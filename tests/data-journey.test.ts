import test from "node:test";
import assert from "node:assert/strict";
import { chapters, faults, initialJourney, journeyNodes, journeyReducer, type Fault } from "../lib/data-journey.ts";

test("every chapter has all learning depths, an observable signal, and a valid focus", () => {
  assert.equal(new Set(chapters.map(c => c.id)).size, chapters.length);
  for (const c of chapters) {
    for (const key of ["story", "architect", "developer", "signal", "takeaway"] as const) assert.ok(c[key].length > 10);
    assert.ok(journeyNodes[c.focus]);
    assert.ok(c.duration >= 8);
    if (c.question) assert.ok(c.question.choices[c.question.answer]);
  }
});

test("guided journey cannot advance past an unanswered check; wrong answers support retries", () => {
  const first = journeyReducer(initialJourney, { type: "next", guided: true });
  assert.equal(first.chapter, 1);
  assert.deepEqual(journeyReducer(first, { type: "next", guided: true }), first);
  const wrong = journeyReducer(first, { type: "answer", choice: 0 });
  assert.equal(wrong.attempts, 1);
  assert.equal(wrong.answered.length, 0);
  const right = journeyReducer(wrong, { type: "answer", choice: 1 });
  assert.equal(right.attempts, 2);
  assert.deepEqual(right.answered, [1]);
  assert.equal(journeyReducer(right, { type: "next", guided: true }).chapter, 2);
  assert.deepEqual(journeyReducer(right, { type: "answer", choice: 1 }), right);
});

test("all fault types block advancement until repaired without discarding mastery", () => {
  for (const fault of Object.keys(faults) as Fault[]) {
    const state = { ...initialJourney, answered: [1] };
    const broken = journeyReducer(state, { type: "fault", fault });
    assert.equal(broken.chapter, faults[fault].chapter);
    assert.deepEqual(journeyReducer(broken, { type: "next", guided: false }), broken);
    assert.deepEqual(journeyReducer(broken, { type: "answer", choice: 0 }), broken);
    const repaired = journeyReducer(broken, { type: "repair" });
    assert.equal(repaired.fault, null);
    assert.deepEqual(repaired.answered, [1]);
    assert.equal(repaired.replay, broken.replay + 1);
  }
});

test("watch mode can complete without fabricating passed checks", () => {
  let state = initialJourney;
  for (let i = 0; i < chapters.length; i++) state = journeyReducer(state, { type: "next", guided: false });
  assert.equal(state.complete, true);
  assert.equal(state.chapter, chapters.length - 1);
  assert.equal(state.answered.length, 0);
});

test("a full guided journey completes with all five checks", () => {
  let state = initialJourney;
  for (const chapter of chapters) {
    if (chapter.question) state = journeyReducer(state, { type: "answer", choice: chapter.question.answer });
    state = journeyReducer(state, { type: "next", guided: true });
  }
  assert.equal(state.complete, true);
  assert.equal(state.answered.length, 5);
  assert.equal(state.attempts, 5);
  const reset = journeyReducer(state, { type: "reset" });
  assert.deepEqual(reset.answered, []);
  assert.equal(reset.chapter, 0);
  assert.equal(reset.complete, false);
});

test("invalid navigation and answers leave state unchanged", () => {
  for (const chapter of [-1, 500, NaN, .5]) assert.deepEqual(journeyReducer(initialJourney, { type: "go", chapter }), initialJourney);
  const state = journeyReducer(initialJourney, { type: "go", chapter: 1 });
  for (const choice of [-1, 3, NaN, .1]) assert.deepEqual(journeyReducer(state, { type: "answer", choice }), state);
});

test("chapter replay preserves progress and revisiting does not count an answer twice", () => {
  let state = journeyReducer(initialJourney, { type: "go", chapter: 1 });
  state = journeyReducer(state, { type: "answer", choice: 1 });
  const replay = journeyReducer(state, { type: "replay" });
  assert.equal(replay.replay, state.replay + 1);
  assert.deepEqual(replay.answered, state.answered);
  state = journeyReducer(replay, { type: "go", chapter: 1 });
  assert.equal(journeyReducer(state, { type: "answer", choice: 1 }).attempts, 1);
});
