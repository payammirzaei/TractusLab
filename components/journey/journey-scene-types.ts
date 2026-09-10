import type { Fault, NodeId } from "@/lib/data-journey";

export type SceneProps = {
  chapter: number;
  progress: number;
  fault: Fault | null;
  paused: boolean;
  reduced: boolean;
  selected: NodeId | null;
  onSelect: (id: NodeId) => void;
};
