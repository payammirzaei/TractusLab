import type { BossScores } from "./boss";
import type { LearningProgress } from "./progress";

export type AchievementRule = {
  scenarioId?: string;
  completedScenarioCount?: number;
  requireAllScenarioIds?: string[];
  bossThreshold?: number;
  bossCount?: number;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rule: AchievementRule;
};

export type LearnerStats = {
  completedScenarios: number;
  masteredBosses: number;
  bestBossScore: number;
  averageBossScore: number;
  earnedAchievements: number;
};

export const LEARNER_NAME_STORAGE_KEY = "tractuslab-learner-name-v1";

export function achievementEarned(
  achievement: AchievementDefinition,
  progress: LearningProgress,
  bossScores: BossScores,
): boolean {
  const { rule } = achievement;

  if (rule.scenarioId && !progress[rule.scenarioId]?.completed) return false;

  if (rule.completedScenarioCount !== undefined) {
    const completed = Object.values(progress).filter((item) => item.completed).length;
    if (completed < rule.completedScenarioCount) return false;
  }

  if (rule.requireAllScenarioIds) {
    if (!rule.requireAllScenarioIds.every((id) => progress[id]?.completed)) return false;
  }

  if (rule.bossCount !== undefined) {
    const threshold = rule.bossThreshold ?? 0;
    const mastered = Object.values(bossScores).filter((score) => score >= threshold).length;
    if (mastered < rule.bossCount) return false;
  }

  return true;
}

export function masteryCertificateUnlocked(
  progress: LearningProgress,
  bossScores: BossScores,
  scenarioIds: string[],
): boolean {
  const allScenariosComplete = scenarioIds.every((id) => progress[id]?.completed);
  const masteredBosses = Object.values(bossScores).filter((score) => score >= 70).length;
  return allScenariosComplete && masteredBosses >= 3;
}

export function learnerStats(
  progress: LearningProgress,
  bossScores: BossScores,
  achievements: AchievementDefinition[],
): LearnerStats {
  const bossValues = Object.values(bossScores);
  const earnedAchievements = achievements.filter((item) => achievementEarned(item, progress, bossScores)).length;

  return {
    completedScenarios: Object.values(progress).filter((item) => item.completed).length,
    masteredBosses: bossValues.filter((score) => score >= 70).length,
    bestBossScore: bossValues.length ? Math.max(...bossValues) : 0,
    averageBossScore: bossValues.length
      ? Math.round(bossValues.reduce((sum, score) => sum + score, 0) / bossValues.length)
      : 0,
    earnedAchievements,
  };
}

export function sanitizeLearnerName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}
