"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOSS_SCORE_STORAGE_KEY,
  parseBossScores,
  saveBestBossScore,
  type BossScores,
} from "@/lib/boss";

export function useBossScores() {
  const [scores, setScores] = useState<BossScores>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setScores(parseBossScores(window.localStorage.getItem(BOSS_SCORE_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(BOSS_SCORE_STORAGE_KEY, JSON.stringify(scores));
  }, [ready, scores]);

  const recordBestScore = useCallback((scenarioId: string, score: number) => {
    setScores((current) => saveBestBossScore(current, scenarioId, score));
  }, []);

  const clearBossScores = useCallback(() => {
    setScores({});
    window.localStorage.removeItem(BOSS_SCORE_STORAGE_KEY);
  }, []);

  return { scores, ready, recordBestScore, clearBossScores };
}
