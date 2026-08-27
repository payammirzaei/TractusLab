"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEMO_PROGRESS_STORAGE_KEY,
  isDemoMode as readDemoMode,
} from "@/lib/demo-mode";
import {
  PROGRESS_STORAGE_KEY,
  markChallengeSolved,
  parseProgress,
  updateStepProgress,
  type LearningProgress,
} from "@/lib/progress";
import {
  clearRemoteProgress,
  loadRemoteState,
  mergeProgress,
  syncLearningProgress,
} from "@/lib/server-sync";

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>({});
  const [ready, setReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const demo = readDemoMode(window.localStorage);
    setDemoMode(demo);
    const key = demo ? DEMO_PROGRESS_STORAGE_KEY : PROGRESS_STORAGE_KEY;
    const local = parseProgress(window.localStorage.getItem(key));
    setProgress(local);
    setReady(true);

    if (demo) return;
    void loadRemoteState()
      .then((remote) => {
        if (!remote) return;
        const merged = mergeProgress(local, remote.progress);
        setProgress(merged);
        return syncLearningProgress(merged);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const key = demoMode ? DEMO_PROGRESS_STORAGE_KEY : PROGRESS_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(progress));
    if (!demoMode) void syncLearningProgress(progress).catch(() => undefined);
  }, [demoMode, progress, ready]);

  const recordStep = useCallback((scenarioId: string, stepIndex: number, stepCount: number) => {
    setProgress((current) => updateStepProgress(current, scenarioId, stepIndex, stepCount));
  }, []);

  const solveChallenge = useCallback((scenarioId: string, challengeId: string) => {
    setProgress((current) => markChallengeSolved(current, scenarioId, challengeId));
  }, []);

  const clearProgress = useCallback(() => {
    setProgress({});
    const demo = readDemoMode(window.localStorage);
    window.localStorage.removeItem(demo ? DEMO_PROGRESS_STORAGE_KEY : PROGRESS_STORAGE_KEY);
    if (!demo) void clearRemoteProgress().catch(() => undefined);
  }, []);

  return { progress, ready, demoMode, recordStep, solveChallenge, clearProgress };
}
