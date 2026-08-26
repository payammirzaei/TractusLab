export type ScenarioProgress = {
  maxStep: number;
  completed: boolean;
  solvedChallenges: string[];
};

export type LearningProgress = Record<string, ScenarioProgress>;

export const PROGRESS_STORAGE_KEY = "tractuslab-progress-v1";

export function emptyScenarioProgress(): ScenarioProgress {
  return { maxStep: 0, completed: false, solvedChallenges: [] };
}

export function updateStepProgress(
  progress: LearningProgress,
  scenarioId: string,
  stepIndex: number,
  stepCount: number,
): LearningProgress {
  const current = progress[scenarioId] ?? emptyScenarioProgress();
  const safeStep = Math.min(Math.max(stepIndex, 0), Math.max(stepCount, 0));

  return {
    ...progress,
    [scenarioId]: {
      ...current,
      maxStep: Math.max(current.maxStep, safeStep),
      completed: current.completed || (stepCount > 0 && safeStep >= stepCount),
    },
  };
}

export function markChallengeSolved(
  progress: LearningProgress,
  scenarioId: string,
  challengeId: string,
): LearningProgress {
  const current = progress[scenarioId] ?? emptyScenarioProgress();
  if (current.solvedChallenges.includes(challengeId)) return progress;

  return {
    ...progress,
    [scenarioId]: {
      ...current,
      solvedChallenges: [...current.solvedChallenges, challengeId],
    },
  };
}

export function scenarioCompletionPercent(
  progress: LearningProgress,
  scenarioId: string,
  stepCount: number,
): number {
  if (stepCount <= 0) return 100;
  const current = progress[scenarioId];
  if (!current) return 0;
  if (current.completed) return 100;
  return Math.round((Math.min(current.maxStep, stepCount) / stepCount) * 100);
}

export function parseProgress(raw: string | null): LearningProgress {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as LearningProgress;
  } catch {
    return {};
  }
}
