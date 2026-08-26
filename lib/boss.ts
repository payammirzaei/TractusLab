import type { ScenarioStep } from "./simulator";

export type BossFightResult = {
  score: number;
  grade: "S" | "A" | "B" | "C";
  wrongAttempts: number;
  hintsUsed: number;
};

export type BossScores = Record<string, number>;

export const BOSS_SCORE_STORAGE_KEY = "tractuslab-boss-scores-v1";

export function calculateBossFightScore(wrongAttempts: number, hintsUsed: number): BossFightResult {
  const safeWrong = Math.max(0, wrongAttempts);
  const safeHints = Math.max(0, hintsUsed);
  const score = Math.max(25, Math.min(100, 100 - safeWrong * 12 - safeHints * 18));
  const grade: BossFightResult["grade"] = score === 100 ? "S" : score >= 85 ? "A" : score >= 65 ? "B" : "C";
  return { score, grade, wrongAttempts: safeWrong, hintsUsed: safeHints };
}

export function saveBestBossScore(scores: BossScores, scenarioId: string, score: number): BossScores {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const current = scores[scenarioId] ?? 0;
  if (current >= safeScore) return scores;
  return { ...scores, [scenarioId]: safeScore };
}

export function parseBossScores(raw: string | null): BossScores {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: BossScores = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) clean[key] = Math.max(0, Math.min(100, Math.round(value)));
    }
    return clean;
  } catch {
    return {};
  }
}

export function newcomerExplanation(step: ScenarioStep): string {
  return step.business;
}
