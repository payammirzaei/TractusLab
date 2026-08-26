"use client";

import { useParams } from "next/navigation";
import { LearnSimulatorV2 } from "@/components/LearnSimulatorV2";
import { RuntimeContentGate } from "@/components/RuntimeContentGate";

export default function ScenarioLearningPage() {
  const params = useParams<{ scenarioId: string }>();
  return <RuntimeContentGate><LearnSimulatorV2 initialScenarioId={params.scenarioId} /></RuntimeContentGate>;
}
