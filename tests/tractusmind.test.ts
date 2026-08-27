import test from "node:test";
import assert from "node:assert/strict";
import { buildTractusMindUrl, tractusMindContextText } from "../lib/tractusmind.ts";

test("TractusMind context contains the lesson concept and grounding request", () => {
  const text = tractusMindContextText({
    concept: "Policy",
    question: "What may the consumer do?",
    explanation: "The provider attaches conditions to the offer.",
    scenarioId: "battery-pcf",
    stepId: "policy",
    sourceHint: "Policy, Data Sovereignty",
  });
  assert.match(text, /Concept: Policy/);
  assert.match(text, /Scenario: battery-pcf/);
  assert.match(text, /ground the answer/i);
});

test("TractusMind URL carries source and lesson context", () => {
  const url = new URL(buildTractusMindUrl("https://mind.example/search", {
    concept: "EDC",
    scenarioId: "battery-pcf",
    stepId: "catalog",
  }));
  assert.equal(url.searchParams.get("source"), "tractuslab");
  assert.equal(url.searchParams.get("scenario"), "battery-pcf");
  assert.equal(url.searchParams.get("step"), "catalog");
  assert.match(url.searchParams.get("q") || "", /Concept: EDC/);
});
