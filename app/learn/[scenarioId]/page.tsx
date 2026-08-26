"use client";

import { useParams } from "next/navigation";
import { LearnSimulator } from "@/components/LearnSimulator";

export default function ScenarioLearningPage() {
  const params = useParams<{ scenarioId: string }>();
  return <LearnSimulator initialScenarioId={params.scenarioId} />;
}
