"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOSS_SCORE_STORAGE_KEY,
  parseBossScores,
  saveBestBossScore,
  type BossScores,
} from "@/lib/boss";
import {
  clearRemoteBossScores,
  loadRemoteState,
  mergeBossScores,
  syncBossScores,
} from "@/lib/server-sync";

export function useBossScores() {
  const [scores, setScores] = useState<BossScores>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = parseBossScores(window.localStorage.getItem(BOSS_SCORE_STORAGE_KEY));
    setScores(local);
    setReady(true);

    void loadRemoteState()
      .then((remote) => {
        if (!remote) return;
        const merged = mergeBossScores(local, remote.bossScores);
        setScores(merged);
        return syncBossScores(merged);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(BOSS_SCORE_STORAGE_KEY, JSON.stringify(scores));
    void syncBossScores(scores).catch(() => undefined);
  }, [ready, scores]);

  const recordBestScore = useCallback((scenarioId: string, score: number) => {
    setScores((current) => saveBestBossScore(current, scenarioId, score));
  }, []);

  const clearBossScores = useCallback(() => {
    setScores({});
    window.localStorage.removeItem(BOSS_SCORE_STORAGE_KEY);
    void clearRemoteBossScores().catch(() => undefined);
  }, []);

  return { scores, ready, recordBestScore, clearBossScores };
}
