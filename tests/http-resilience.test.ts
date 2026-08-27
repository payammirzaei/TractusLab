import assert from "node:assert/strict";
import test from "node:test";

import { isRetryableStatus, resilientFetch, retryDelayMs } from "../lib/http-resilience.ts";

test("retry policy only marks transient statuses", () => {
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(404), false);
  assert.equal(isRetryableStatus(401), false);
  assert.ok(retryDelayMs(2, 10) > retryDelayMs(1, 10));
});

test("GET retries transient responses and returns the recovered response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return calls < 3
      ? new Response("temporary", { status: 503 })
      : new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const response = await resilientFetch("https://example.test/state", { method: "GET" }, { attempts: 3, baseDelayMs: 1, timeoutMs: 1000 });
    assert.equal(response.status, 200);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mutations are never automatically replayed", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("temporary", { status: 503 });
  }) as typeof fetch;

  try {
    const response = await resilientFetch("https://example.test/publish", { method: "POST", body: "{}" }, { attempts: 3, baseDelayMs: 1 });
    assert.equal(response.status, 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
