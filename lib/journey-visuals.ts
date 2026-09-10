import type { NodeId } from "./data-journey";

/** Responsive coordinates for a two-company dataspace stage. */
export function journeyLayout(aspect: number) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const compact = safeAspect < .9;
  const companyScale = compact ? .72 : safeAspect < 1.25 ? .86 : 1;
  const companyX = compact ? 3.35 : Math.min(5.7, Math.max(4.45, safeAspect * 3.15));
  const controlY = .75;
  const dataY = -1.05;
  const topY = 2.25;
  const bottomY = -2.35;
  const positions: Record<NodeId, [number, number, number]> = {
    provider: [-companyX, 0, -.2],
    consumer: [companyX, 0, .2],
    catalog: [-companyX + 1.55 * companyScale, 1.55, .65],
    identity: [-companyX + 1.55 * companyScale, controlY, .95],
    policy: [companyX - 1.55 * companyScale, 1.55, .65],
    agreement: [0, controlY, 1.05],
  };
  const halfWidth = companyX + 2.15 * companyScale;
  const halfHeight = 3.75;
  const vertical = halfHeight / Math.tan(Math.PI / 9);
  const horizontal = halfWidth / (Math.tan(Math.PI / 9) * safeAspect);
  return { positions, distance: Math.max(vertical, horizontal) + 1.35, companyX, companyScale, controlY, dataY, topY, bottomY };
}

export const journeyMoments = [
  { title: "The source stays home.", detail: "Company A begins with a private battery-footprint record.", result: "SOURCE READY" },
  { title: "Publish the promise, not the payload.", detail: "Asset and policies define what may later be offered.", result: "OFFER CONFIGURED" },
  { title: "Find the language before the conversation.", detail: "Company B discovers a compatible DSP endpoint first.", result: "CONNECTOR READY" },
  { title: "Ask. Prove. Filter. Return.", detail: "Credentials and access policy shape the catalogue Company B receives.", result: "OFFER VISIBLE" },
  { title: "Know the terms before you ask.", detail: "Company B selects an offer that fits its intended use.", result: "OFFER SELECTED" },
  { title: "Agreement is a control-plane event.", detail: "Usage policy is evaluated before the negotiation can finalize.", result: "AGREEMENT FINALIZED" },
  { title: "First the key. Then the data.", detail: "The EDR arrives before the authorized data-plane fetch.", result: "COPY DELIVERED" },
  { title: "Governed access becomes business value.", detail: "Company B uses the copy while Company A keeps the source.", result: "VALUE CREATED" },
] as const;
