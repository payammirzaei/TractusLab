"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOSS_SCORE_STORAGE_KEY,
  parseBossScores,
  saveBestBossScore,
  type BossScores,
} from "@/lib/boss";
import {
  DEMO_BOSS_STORAGE_KEY,
  isDemoMode as readDemoMode,
} from "@/lib/demo-mode";
import {
  clearRemoteBossScores,
  loadRemoteState,
  mergeBossScores,
  syncBossScores,
} from "@/lib/server-sync";

export function useBossScores() {
  const [scores, setScores] = useState<BossScores>({});
  const [ready, setReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const demo = readDemoMode(window.localStorage);
    setDemoMode(demo);
    const key = demo ? DEMO_BOSS_STORAGE_KEY : BOSS_SCORE_STORAGE_KEY;
    const local = parseBossScores(window.localStorage.getItem(key));
    setScores(local);
    setReady(true);

    if (demo) return;
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
    const key = demoMode ? DEMO_BOSS_STORAGE_KEY : BOSS_SCORE_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(scores));
    if (!demoMode) void syncBossScores(scores).catch(() => undefined);
  }, [demoMode, ready, scores]);

  const recordBestScore = useCallback((scenarioId: string, score: number) => {
    setScores((current) => saveBestBossScore(current, scenarioId, score));
  }, []);

  const clearBossScores = useCallback(() => {
    setScores({});
    const demo = readDemoMode(window.localStorage);
    window.localStorage.removeItem(demo ? DEMO_BOSS_STORAGE_KEY : BOSS_SCORE_STORAGE_KEY);
    if (!demo) void clearRemoteBossScores().catch(() => undefined);
  }, []);

  return { scores, ready, demoMode, recordBestScore, clearBossScores };
}
