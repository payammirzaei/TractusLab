import type { AchievementDefinition } from "../lib/profile";

export const coreScenarioIds = [
  "battery-pcf",
  "digital-twin",
  "demand-capacity",
  "traceability",
  "quality",
  "circular-economy",
] as const;

export const achievements: AchievementDefinition[] = [
  {
    id: "first-exchange",
    title: "First Governed Exchange",
    description: "Completed the Battery PCF foundation scenario.",
    icon: "↔",
    rule: { scenarioId: "battery-pcf" },
  },
  {
    id: "twin-finder",
    title: "Twin Finder",
    description: "Completed the Digital Twin discovery scenario.",
    icon: "◫",
    rule: { scenarioId: "digital-twin" },
  },
  {
    id: "three-use-cases",
    title: "Use-Case Explorer",
    description: "Completed three different dataspace scenarios.",
    icon: "✦",
    rule: { completedScenarioCount: 3 },
  },
  {
    id: "clean-diagnosis",
    title: "Clean Diagnosis",
    description: "Scored at least 90 in one Boss Fight.",
    icon: "⚡",
    rule: { bossThreshold: 90, bossCount: 1 },
  },
  {
    id: "troubleshooter",
    title: "Dataspace Troubleshooter",
    description: "Scored at least 70 in three Boss Fights.",
    icon: "⌁",
    rule: { bossThreshold: 70, bossCount: 3 },
  },
  {
    id: "full-path",
    title: "Scenario Complete",
    description: "Completed all six core business scenarios.",
    icon: "✓",
    rule: { requireAllScenarioIds: [...coreScenarioIds] },
  },
  {
    id: "dataspace-master",
    title: "TractusLab Mastery",
    description: "Completed every core scenario and proved diagnostic mastery in three Boss Fights.",
    icon: "◆",
    rule: {
      requireAllScenarioIds: [...coreScenarioIds],
      bossThreshold: 70,
      bossCount: 3,
    },
  },
];
