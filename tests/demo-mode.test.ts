import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_BOSS_STORAGE_KEY,
  DEMO_MODE_STORAGE_KEY,
  DEMO_PROGRESS_STORAGE_KEY,
  demoProgressSeed,
  disableDemoMode,
  enableDemoMode,
  isDemoMode,
  resetDemoMode,
} from "../lib/demo-mode.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

test("demo mode seeds isolated progress and boss storage", () => {
  const storage = memoryStorage();
  enableDemoMode(storage);
  assert.equal(isDemoMode(storage), true);
  assert.equal(storage.getItem(DEMO_MODE_STORAGE_KEY), "1");
  assert.deepEqual(JSON.parse(storage.getItem(DEMO_PROGRESS_STORAGE_KEY) || "{}"), demoProgressSeed);
  assert.deepEqual(JSON.parse(storage.getItem(DEMO_BOSS_STORAGE_KEY) || "{}"), {});
});

test("reset demo mode restores the seed without touching the mode flag", () => {
  const storage = memoryStorage();
  enableDemoMode(storage);
  storage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify({ changed: true }));
  resetDemoMode(storage);
  assert.equal(isDemoMode(storage), true);
  assert.deepEqual(JSON.parse(storage.getItem(DEMO_PROGRESS_STORAGE_KEY) || "{}"), demoProgressSeed);
});

test("disable demo mode removes only demo keys", () => {
  const storage = memoryStorage();
  storage.setItem("real-progress", "keep-me");
  enableDemoMode(storage);
  disableDemoMode(storage);
  assert.equal(isDemoMode(storage), false);
  assert.equal(storage.getItem(DEMO_PROGRESS_STORAGE_KEY), null);
  assert.equal(storage.getItem(DEMO_BOSS_STORAGE_KEY), null);
  assert.equal(storage.getItem("real-progress"), "keep-me");
});
