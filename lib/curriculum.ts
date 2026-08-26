import type { BossScores } from "./boss";
import type { LearningProgress } from "./progress";

export type MissionKind = "scenario" | "mastery";

export type MissionDefinition = {
  id: string;
  title: string;
  description: string;
  kind: MissionKind;
  scenarioId?: string;
  prerequisiteIds: string[];
  competencyIds: string[];
};

export type CompetencyDefinition = {
  id: string;
  label: string;
  description: string;
  scenarioId?: string;
  bossThreshold?: number;
  bossCount?: number;
};

export type MissionState = "locked" | "available" | "in-progress" | "complete";

export function isMissionComplete(
  mission: MissionDefinition,
  progress: LearningProgress,
  bossScores: BossScores,
): boolean {
  if (mission.kind === "scenario") {
    return Boolean(mission.scenarioId && progress[mission.scenarioId]?.completed);
  }

  const masteredBosses = Object.values(bossScores).filter((score) => score >= 70).length;
  return masteredBosses >= 3;
}

export function isMissionUnlocked(
  mission: MissionDefinition,
  missions: MissionDefinition[],
  progress: LearningProgress,
  bossScores: BossScores,
): boolean {
  if (mission.prerequisiteIds.length === 0) return true;

  return mission.prerequisiteIds.every((prerequisiteId) => {
    const prerequisite = missions.find((item) => item.id === prerequisiteId);
    return prerequisite ? isMissionComplete(prerequisite, progress, bossScores) : false;
  });
}

export function missionState(
  mission: MissionDefinition,
  missions: MissionDefinition[],
  progress: LearningProgress,
  bossScores: BossScores,
): MissionState {
  if (isMissionComplete(mission, progress, bossScores)) return "complete";
  if (!isMissionUnlocked(mission, missions, progress, bossScores)) return "locked";

  if (mission.kind === "scenario" && mission.scenarioId) {
    const saved = progress[mission.scenarioId];
    if (saved && saved.maxStep > 0) return "in-progress";
  }

  return "available";
}

export function curriculumCompletionPercent(
  missions: MissionDefinition[],
  progress: LearningProgress,
  bossScores: BossScores,
): number {
  if (missions.length === 0) return 100;
  const complete = missions.filter((mission) => isMissionComplete(mission, progress, bossScores)).length;
  return Math.round((complete / missions.length) * 100);
}

export function recommendedMission(
  missions: MissionDefinition[],
  progress: LearningProgress,
  bossScores: BossScores,
): MissionDefinition | null {
  const inProgress = missions.find((mission) => missionState(mission, missions, progress, bossScores) === "in-progress");
  if (inProgress) return inProgress;
  return missions.find((mission) => missionState(mission, missions, progress, bossScores) === "available") ?? null;
}

export function competencyEarned(
  competency: CompetencyDefinition,
  progress: LearningProgress,
  bossScores: BossScores,
): boolean {
  if (competency.scenarioId) return Boolean(progress[competency.scenarioId]?.completed);

  if (competency.bossCount && competency.bossThreshold !== undefined) {
    return Object.values(bossScores).filter((score) => score >= competency.bossThreshold!).length >= competency.bossCount;
  }

  return false;
}

export function masteredBossCount(bossScores: BossScores, threshold = 70): number {
  return Object.values(bossScores).filter((score) => score >= threshold).length;
}
