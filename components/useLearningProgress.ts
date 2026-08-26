"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROGRESS_STORAGE_KEY,
  markChallengeSolved,
  parseProgress,
  updateStepProgress,
  type LearningProgress,
} from "@/lib/progress";

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(parseProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
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
  }, []);

  return { progress, ready, recordStep, solveChallenge, clearProgress };
}
