"use client";

import { useParams } from "next/navigation";
import { LearnSimulatorV2 } from "@/components/LearnSimulatorV2";

export default function ScenarioLearningPage() {
  const params = useParams<{ scenarioId: string }>();
  return <LearnSimulatorV2 initialScenarioId={params.scenarioId} />;
}
