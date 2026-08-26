import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessContent,
  canAuthor,
  canPublish,
  canReview,
  nextActionLabel,
  workflowStageIndex,
} from "../lib/content-workflow.ts";

test("content roles separate author review and publish responsibilities", () => {
  assert.equal(canAccessContent("learner"), false);
  assert.equal(canAuthor("author"), true);
  assert.equal(canReview("author"), false);
  assert.equal(canReview("reviewer"), true);
  assert.equal(canPublish("reviewer"), false);
  assert.equal(canPublish("admin"), true);
});

test("workflow rail maps content states to understandable stages", () => {
  assert.equal(workflowStageIndex("draft"), 0);
  assert.equal(workflowStageIndex("changes_requested"), 0);
  assert.equal(workflowStageIndex("in_review"), 1);
  assert.equal(workflowStageIndex("approved"), 2);
  assert.equal(workflowStageIndex("published"), 3);
  assert.equal(workflowStageIndex("archived"), 3);
});

test("next action communicates which role owns the next move", () => {
  assert.equal(nextActionLabel("draft", "author"), "Submit for review");
  assert.equal(nextActionLabel("in_review", "reviewer"), "Review revision");
  assert.equal(nextActionLabel("approved", "admin"), "Publish revision");
  assert.equal(nextActionLabel("approved", "author"), "Waiting for another role");
  assert.equal(nextActionLabel("published", "author"), "Create next revision");
});
