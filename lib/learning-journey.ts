import type { BossScores } from "./boss";
import type { LearningProgress } from "./progress";

export type JourneyStageId = "discover" | "learn" | "practice" | "validate" | "complete";
export type JourneyStageState = "locked" | "current" | "complete";

export type JourneyStage = {
  id: JourneyStageId;
  label: string;
  description: string;
  href: string;
  state: JourneyStageState;
};

export type LearningJourneyState = {
  stages: JourneyStage[];
  current: JourneyStageId;
  percent: number;
  completedCount: number;
};

const FLAGSHIP = "battery-pcf";

export function deriveLearningJourney(
  progress: LearningProgress,
  bossScores: BossScores,
): LearningJourneyState {
  const flagship = progress[FLAGSHIP];
  const discovered = Boolean(flagship || Object.keys(progress).length > 0);
  const learned = Boolean(flagship?.completed);
  const practiced = Boolean(flagship?.solvedChallenges.length);
  const validated = (bossScores[FLAGSHIP] ?? 0) >= 70;

  const completedFlags = [discovered, learned, practiced, validated];
  const completedCount = completedFlags.filter(Boolean).length;
  const current: JourneyStageId = !discovered
    ? "discover"
    : !learned
      ? "learn"
      : !practiced
        ? "practice"
        : !validated
          ? "validate"
          : "complete";

  const order: JourneyStageId[] = ["discover", "learn", "practice", "validate", "complete"];
  const completedById: Record<JourneyStageId, boolean> = {
    discover: discovered,
    learn: learned,
    practice: practiced,
    validate: validated,
    complete: validated,
  };
  const config: Record<JourneyStageId, Omit<JourneyStage, "state">> = {
    discover: {
      id: "discover",
      label: "Discover",
      description: "See the business problem and the actors.",
      href: "/scenarios",
    },
    learn: {
      id: "learn",
      label: "Learn",
      description: "Understand the governed exchange step by step.",
      href: "/learn/battery-pcf",
    },
    practice: {
      id: "practice",
      label: "Practice",
      description: "Apply the concept inside the lesson.",
      href: "/learn/battery-pcf#practice",
    },
    validate: {
      id: "validate",
      label: "Validate",
      description: "Diagnose a failure in the Boss Fight.",
      href: "/learn/battery-pcf?mode=challenge",
    },
    complete: {
      id: "complete",
      label: "Complete",
      description: "Review mastery and keep exploring.",
      href: "/profile",
    },
  };

  const currentIndex = order.indexOf(current);
  const stages = order.map((id, index): JourneyStage => ({
    ...config[id],
    state: completedById[id] && id !== current
      ? "complete"
      : id === current
        ? "current"
        : index < currentIndex
          ? "complete"
          : "locked",
  }));

  return {
    stages,
    current,
    percent: Math.round((completedCount / 4) * 100),
    completedCount,
  };
}
