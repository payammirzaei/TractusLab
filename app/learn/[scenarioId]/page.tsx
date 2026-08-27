"use client";

import { useParams, useSearchParams } from "next/navigation";
import { LearnSimulatorV2 } from "@/components/LearnSimulatorV2";
import { RuntimeContentGate } from "@/components/RuntimeContentGate";

export default function ScenarioLearningPage() {
  const params = useParams<{ scenarioId: string }>();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "challenge" ? "challenge" : "learn";

  return (
    <RuntimeContentGate>
      <LearnSimulatorV2 initialScenarioId={params.scenarioId} initialMode={initialMode} />
    </RuntimeContentGate>
  );
}
