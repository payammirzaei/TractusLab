"use client";

import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    const local = parseProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY));
    setProgress(local);
    setReady(true);

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
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    void syncLearningProgress(progress).catch(() => undefined);
  }, [progress, ready]);

  const recordStep = useCallback((scenarioId: string, stepIndex: number, stepCount: number) => {
    setProgress((current) => updateStepProgress(current, scenarioId, stepIndex, stepCount));
  }, []);

  const solveChallenge = useCallback((scenarioId: string, challengeId: string) => {
    setProgress((current) => markChallengeSolved(current, scenarioId, challengeId));
  }, []);

  const clearProgress = useCallback(() => {
    setProgress({});
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
    void clearRemoteProgress().catch(() => undefined);
  }, []);

  return { progress, ready, recordStep, solveChallenge, clearProgress };
}
