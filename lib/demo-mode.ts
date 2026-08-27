import type { BossScores } from "./boss";
import type { LearningProgress } from "./progress";

export const DEMO_MODE_STORAGE_KEY = "tractuslab-demo-mode-v1";
export const DEMO_PROGRESS_STORAGE_KEY = "tractuslab-demo-progress-v1";
export const DEMO_BOSS_STORAGE_KEY = "tractuslab-demo-boss-v1";

export const demoProgressSeed: LearningProgress = {
  "battery-pcf": {
    maxStep: 2,
    completed: false,
    solvedChallenges: [],
  },
};

export const demoBossSeed: BossScores = {};

export function isDemoMode(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(DEMO_MODE_STORAGE_KEY) === "1";
}

export function enableDemoMode(storage: Pick<Storage, "setItem">): void {
  storage.setItem(DEMO_MODE_STORAGE_KEY, "1");
  storage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify(demoProgressSeed));
  storage.setItem(DEMO_BOSS_STORAGE_KEY, JSON.stringify(demoBossSeed));
}

export function resetDemoMode(storage: Pick<Storage, "setItem">): void {
  storage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify(demoProgressSeed));
  storage.setItem(DEMO_BOSS_STORAGE_KEY, JSON.stringify(demoBossSeed));
}

export function disableDemoMode(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(DEMO_MODE_STORAGE_KEY);
  storage.removeItem(DEMO_PROGRESS_STORAGE_KEY);
  storage.removeItem(DEMO_BOSS_STORAGE_KEY);
}
