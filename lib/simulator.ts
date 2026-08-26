export type LearningDepth = "business" | "architecture" | "developer";

export type FlowDirection =
  | "manufacturer-to-supplier"
  | "supplier-to-manufacturer"
  | "both"
  | "internal";

export type ScenarioStep = {
  id: string;
  technicalName: string;
  question: string;
  business: string;
  architecture: string;
  developer: string;
  whyNeeded: string;
  withoutIt: string;
  actionLabel: string;
  direction: FlowDirection;
  mapFocus: string[];
  glossary: string[];
  payload?: string;
};

export type ChallengeOption = {
  id: string;
  label: string;
  explanation: string;
};

export type Challenge = {
  id: string;
  title: string;
  prompt: string;
  symptom: string;
  hint: string;
  correctOptionId: string;
  options: ChallengeOption[];
  rootCause: string;
};

export type LearningScenario = {
  id: string;
  title: string;
  shortTitle: string;
  useCase: string;
  asset: string;
  goal: string;
  supplierLabel: string;
  manufacturerLabel: string;
  steps: ScenarioStep[];
  challenges: Challenge[];
};

export type ChallengeResult = {
  correct: boolean;
  explanation: string;
};

export function progressPercent(stepIndex: number, stepCount: number): number {
  if (stepCount <= 0) return 100;
  const safeIndex = Math.min(Math.max(stepIndex, 0), stepCount);
  return Math.round((safeIndex / stepCount) * 100);
}

export function nextStepIndex(stepIndex: number, stepCount: number): number {
  return Math.min(Math.max(stepIndex, 0) + 1, Math.max(stepCount, 0));
}

export function previousStepIndex(stepIndex: number): number {
  return Math.max(stepIndex - 1, 0);
}

export function isScenarioComplete(stepIndex: number, stepCount: number): boolean {
  return stepIndex >= stepCount;
}

export function evaluateChallenge(challenge: Challenge, optionId: string): ChallengeResult {
  const option = challenge.options.find((item) => item.id === optionId);
  if (!option) {
    return { correct: false, explanation: "That option does not exist in this challenge." };
  }

  return {
    correct: option.id === challenge.correctOptionId,
    explanation: option.explanation,
  };
}

export function validateScenario(scenario: LearningScenario): string[] {
  const errors: string[] = [];
  const stepIds = new Set<string>();
  const challengeIds = new Set<string>();

  if (!scenario.id.trim()) errors.push("Scenario id is required.");
  if (!scenario.title.trim()) errors.push("Scenario title is required.");
  if (scenario.steps.length === 0) errors.push("Scenario must contain at least one learning step.");

  for (const step of scenario.steps) {
    if (stepIds.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
    stepIds.add(step.id);

    if (!step.business.trim() || !step.architecture.trim() || !step.developer.trim()) {
      errors.push(`Step ${step.id} must define all three learning depths.`);
    }
  }

  for (const challenge of scenario.challenges) {
    if (challengeIds.has(challenge.id)) errors.push(`Duplicate challenge id: ${challenge.id}`);
    challengeIds.add(challenge.id);

    if (!challenge.options.some((option) => option.id === challenge.correctOptionId)) {
      errors.push(`Challenge ${challenge.id} has no matching correct option.`);
    }
  }

  return errors;
}
