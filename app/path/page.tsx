import { CurriculumPath } from "@/components/CurriculumPath";
import { RuntimeContentGate } from "@/components/RuntimeContentGate";

export default function LearningPathPage() {
  return <RuntimeContentGate><CurriculumPath /></RuntimeContentGate>;
}
