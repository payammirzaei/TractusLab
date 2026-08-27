import { DemoExperience } from "@/components/DemoExperience";
import { LearnerNav } from "@/components/LearnerNav";

export default function DemoPage() {
  return (
    <main className="min-h-screen pb-16">
      <LearnerNav active="path" eyebrow="ARENA2036 demo" />
      <DemoExperience />
    </main>
  );
}
