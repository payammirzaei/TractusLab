import assert from "node:assert/strict";
import test from "node:test";
import { scenarioDocuments } from "../data/content-registry.ts";
import { mergePublishedContent, type PublishedContentEnvelope } from "../lib/runtime-content.ts";

function envelope(index = 0): PublishedContentEnvelope {
  const document = structuredClone(scenarioDocuments[index]);
  document.metadata.version = "1.1.0";
  document.scenario.title = `${document.scenario.title} · server`;
  return {
    scenario_id: document.metadata.id,
    revision_number: 2,
    document,
  };
}

test("valid server-published content overlays the packaged scenario in place", () => {
  const remote = envelope(0);
  const result = mergePublishedContent(scenarioDocuments, [remote]);
  assert.equal(result.overlayCount, 1);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.documents.length, scenarioDocuments.length);
  assert.equal(result.documents[0].metadata.version, "1.1.0");
  assert.match(result.documents[0].scenario.title, /server$/);
});

test("invalid remote content is rejected without removing packaged fallback", () => {
  const remote = envelope(0);
  (remote.document as { metadata: { status: string } }).metadata.status = "draft";
  const result = mergePublishedContent(scenarioDocuments, [remote]);
  assert.equal(result.overlayCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.documents[0].metadata.version, scenarioDocuments[0].metadata.version);
});

test("envelope and document scenario ids must match", () => {
  const remote = envelope(0);
  remote.scenario_id = "wrong-id";
  const result = mergePublishedContent(scenarioDocuments, [remote]);
  assert.equal(result.overlayCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.match(result.rejected[0], /does not match/);
});

test("a newly published server scenario is appended after packaged scenarios", () => {
  const document = structuredClone(scenarioDocuments[0]);
  document.metadata.id = "server-only-scenario";
  document.metadata.version = "1.0.0";
  document.scenario.id = "server-only-scenario";
  document.scenario.title = "Server-only scenario";
  document.scenario.shortTitle = "Server only";
  const result = mergePublishedContent(scenarioDocuments, [{ scenario_id: "server-only-scenario", revision_number: 1, document }]);
  assert.equal(result.overlayCount, 1);
  assert.equal(result.documents.length, scenarioDocuments.length + 1);
  assert.equal(result.documents.at(-1)?.metadata.id, "server-only-scenario");
});
