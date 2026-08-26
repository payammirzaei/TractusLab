import { LearnSimulatorV2 } from "@/components/LearnSimulatorV2";
import { RuntimeContentGate } from "@/components/RuntimeContentGate";

export default function LearnPage() {
  return <RuntimeContentGate><LearnSimulatorV2 /></RuntimeContentGate>;
}
