import type { NodeId } from "./data-journey";

/** Spread across the available canvas instead of keeping a tiny fixed central cluster. */
export function journeyLayout(aspect: number) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const spread = Math.max(5, safeAspect * 4.4);
  const lane = Math.max(2.2, spread * .37);
  const positions: Record<NodeId, [number, number, number]> = {
    provider: [-spread, 0, 0], consumer: [spread, 0, 0],
    catalog: [-lane, 2.8, 0], identity: [lane, 2.8, 0],
    policy: [-lane, -2.4, 0], agreement: [lane, -2.4, 0],
  };
  // Reserve space for neural halos, lower labels and path curvature.
  const halfHeight = Math.max(4.6, (spread + 2.4) / safeAspect);
  return { positions, distance: halfHeight / Math.tan(Math.PI / 9) + 1.2 };
}

export const journeyMoments = [
  { title: "One record. A world of possibility.", detail: "The source stays with Company A.", result: "SOURCE READY" },
  { title: "An invitation, not a download.", detail: "Only the offer travels into the catalogue.", result: "OFFER PUBLISHED" },
  { title: "A question finds its answer.", detail: "Company B discovers what it can request.", result: "OFFER FOUND" },
  { title: "Two identities. One trusted connection.", detail: "Watch the gateway rings find the same rhythm.", result: "IDENTITY VERIFIED" },
  { title: "The right purpose opens the path.", detail: "Intended use must fit the offered terms.", result: "TERMS COMPATIBLE" },
  { title: "The moment both sides agree.", detail: "The golden seal records the accepted terms.", result: "AGREEMENT FORMED" },
  { title: "Permission becomes movement.", detail: "Follow the copy. Notice the original remains.", result: "COPY DELIVERED" },
  { title: "Shared data. New possibilities.", detail: "Company B can use the record under the agreed terms.", result: "VALUE CREATED" },
] as const;
