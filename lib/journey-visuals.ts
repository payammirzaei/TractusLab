import type { NodeId } from "./data-journey";

/**
 * Responsive 3D stage layout. The semantic graph still reads left-to-right,
 * but important nodes occupy different depth planes so camera motion and
 * parallax reveal real volume without making the learning path harder to read.
 */
export function journeyLayout(aspect: number) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const spread = Math.max(5, safeAspect * 4.4);
  const lane = Math.max(2.2, spread * .37);
  const depth = safeAspect < .9 ? .45 : 1;
  const positions: Record<NodeId, [number, number, number]> = {
    provider: [-spread, 0, -.75 * depth],
    consumer: [spread, 0, .75 * depth],
    catalog: [-lane, 2.8, .9 * depth],
    identity: [lane, 2.8, -.7 * depth],
    policy: [-lane, -2.4, .45 * depth],
    agreement: [lane, -2.4, 1.15 * depth],
  };
  // Reserve space for neural halos, lower labels, path curvature and camera pushes.
  const halfHeight = Math.max(4.8, (spread + 2.5) / safeAspect);
  return { positions, distance: halfHeight / Math.tan(Math.PI / 9) + 1.65 };
}

export const journeyMoments = [
  { title: "One record. A world of possibility.", detail: "The source stays with Company A.", result: "SOURCE READY" },
  { title: "An invitation, not a download.", detail: "The offer becomes discoverable. The source stays local.", result: "OFFER PUBLISHED" },
  { title: "A question finds its answer.", detail: "Company B discovers what it can request.", result: "OFFER FOUND" },
  { title: "Evidence first. Trust follows.", detail: "The rings align only after the identity check.", result: "IDENTITY VERIFIED" },
  { title: "The right purpose opens the path.", detail: "Intended use must fit the offered terms.", result: "TERMS COMPATIBLE" },
  { title: "The moment both sides agree.", detail: "The golden seal records the accepted terms.", result: "AGREEMENT FORMED" },
  { title: "Permission becomes movement.", detail: "Follow the copy. Notice the original remains.", result: "COPY DELIVERED" },
  { title: "Shared data. New possibilities.", detail: "Company B can use the record under the agreed terms.", result: "VALUE CREATED" },
] as const;
