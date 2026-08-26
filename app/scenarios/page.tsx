import { RuntimeContentGate } from "@/components/RuntimeContentGate";
import { ScenarioHub } from "@/components/ScenarioHub";

export default function ScenarioHubPage() {
  return <RuntimeContentGate><ScenarioHub /></RuntimeContentGate>;
}
