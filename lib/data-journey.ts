/** A conceptual teaching model, not a live connector or normative DSP implementation. */
export type Depth = "story" | "architect" | "developer";
export type NodeId = "provider" | "consumer" | "catalog" | "identity" | "policy" | "agreement";
export type Fault = "identity" | "policy" | "offline";
export type Chapter = {
  id: string; label: string; title: string; verb: string; signal: string;
  story: string; architect: string; developer: string; takeaway: string;
  focus: NodeId; duration: number; message: Record<string, unknown>;
  question?: { prompt: string; choices: string[]; answer: number; explanation: string };
};

export const journeyNodes: Record<NodeId, { label: string; role: string; description: string; position: [number, number, number]; color: string }> = {
  provider: { label: "Company A", role: "Supplier · Provider", description: "Owns the battery carbon-footprint record. Its connector exposes offers and governs access; the source record stays in its own system.", position: [-5, 0, 0], color: "#59edcf" },
  consumer: { label: "Company B", role: "Manufacturer · Consumer", description: "Needs the supplier’s battery footprint to calculate its product footprint. Its connector discovers offers and requests an agreement and transfer.", position: [5, 0, 0], color: "#a5a0ff" },
  catalog: { label: "Data offer", role: "Provider catalogue", description: "A description of available data and its offered terms. This is Company A’s catalogue, not a central warehouse containing everyone’s data.", position: [-2.8, 2.6, 0], color: "#79bfff" },
  identity: { label: "Identity", role: "Trust & credentials", description: "Participants prove who they are using verifiable credentials and configured trust services. Checks also occur during protocol interactions; this chapter isolates the idea for learning.", position: [0, 3.1, -.5], color: "#75dbff" },
  policy: { label: "Policy", role: "Access & usage terms", description: "Access policies determine which offers a participant may see. Contract policies describe offered usage terms. Enforcement depends on supported rules, the deployment, and governance.", position: [0, -2.6, .4], color: "#ffba77" },
  agreement: { label: "Agreement", role: "Accepted terms", description: "Both participants reach a recorded agreement for a particular asset and policy. Negotiation is protocol agreement, not arbitrary bargaining or an automatically enforceable digital-rights system.", position: [0, .1, 0], color: "#f5d786" },
};

export const chapters: Chapter[] = [
  { id: "asset", label: "Prepare", title: "One record. Two possibilities.", verb: "Publish the offer", signal: "SOURCE RECORD", focus: "provider", duration: 9,
    story: "A supplier knows its battery’s carbon footprint. A manufacturer needs that number. The record begins inside Company A.",
    architect: "Company A registers an asset pointing to its source data. A shared semantic model gives the record a meaning Company B can interpret.",
    developer: "The asset metadata identifies the record. The private data address tells the provider data plane how to reach it. Values below are fictional teaching data, not a conformant PCF payload.",
    takeaway: "Sharing starts with a source and a shared meaning.", message: { assetId: "battery-pcf-demo", battery: "BAT-204", footprint: 42.6, unit: "kg CO₂e", classification: "Fictional, simplified record" } },
  { id: "publish", label: "Publish", title: "Make it findable. Keep it local.", verb: "Discover the offer", signal: "METADATA ONLY", focus: "catalog", duration: 10,
    story: "A blue pulse carries the description and terms into Company A’s catalogue. The green data core does not leave the supplier.",
    architect: "An asset selector, access policy and contract policy form a contract definition. The provider exposes eligible offers through its catalogue.",
    developer: "Asset → policy definitions → contract definition. The catalogue response describes datasets and offers, not the private source credentials or the actual footprint record.",
    takeaway: "An offer is not the data itself.", message: { dataset: "battery-pcf-demo", description: "Battery carbon-footprint record", offeredUse: "Product-footprint calculation", payloadIncluded: false },
    question: { prompt: "What becomes visible in the catalogue?", choices: ["The supplier’s whole database", "A data description and offered terms", "The private source credentials"], answer: 1, explanation: "The offer describes what can be requested. The source record and credentials stay private." } },
  { id: "discover", label: "Discover", title: "A question travels. An offer returns.", verb: "Explore the trust check", signal: "CATALOGUE REQUEST / RESPONSE", focus: "catalog", duration: 10,
    story: "Company B asks the supplier what it can request. Search pulses return with the battery data offer, not the battery data.",
    architect: "The consumer connector queries a provider catalogue. Discovery and access are participant-aware. This scene uses a known partner endpoint, not a universal central catalogue.",
    developer: "A catalogue request/response is a control-plane exchange. Authentication and access-policy checks can already apply here; identity is expanded in the next teaching chapter.",
    takeaway: "Discover first. Request access next.", message: { from: "Company B", to: "Company A catalogue", result: "battery-pcf-demo", kind: "Offer metadata" } },
  { id: "identity", label: "Trust", title: "Trust is proven, not assumed.", verb: "Check the terms", signal: "CREDENTIAL VERIFICATION", focus: "identity", duration: 12,
    story: "Two rings find the same rhythm. Company A checks that the requester is a trusted participant before allowing the exchange to progress.",
    architect: "Participant credentials and configured trust anchors establish identity. Identity verification does not by itself grant permission to use every dataset.",
    developer: "This synchronized handshake is a visual metaphor, not a literal cryptographic message sequence. Identity checks are embedded in authenticated protocol interactions, not performed only once after discovery.",
    takeaway: "Knowing who you are is different from allowing what you want.", message: { participant: "Company B", credentials: "Verified in this simulation", trust: "Accepted", dataTransferred: false },
    question: { prompt: "A valid identity means…", choices: ["Every dataset can be downloaded", "Usage terms no longer matter", "We know the participant; permission still matters"], answer: 2, explanation: "Identity establishes who is requesting. Policies and an agreement still govern this exchange." } },
  { id: "policy", label: "Policy", title: "Permission has a shape.", verb: "Form an agreement", signal: "TERMS EVALUATION", focus: "policy", duration: 12,
    story: "The supplier offers its data for product-footprint calculation. The manufacturer’s intended use fits. Three orbiting rules align into a clear path.",
    architect: "Access policies filter visibility; contract policies define offered usage conditions. These example terms teach the concept and are not universal built-in EDC enforcement features.",
    developer: "Policy evaluation relies on supported operands, functions and configured scopes. ODRL can describe terms, but arbitrary purpose or redistribution restrictions require suitable technical and organizational enforcement.",
    takeaway: "Trusted participants still need compatible terms.", message: { intendedUse: "Product-footprint calculation", partner: "Company B", redistribution: "Not permitted by the example terms", evaluation: "Compatible in this simulation" },
    question: { prompt: "Company B wants to resell this record. What happens?", choices: ["Proceed because its identity is valid", "Stop: that use conflicts with the offer", "Remove the policy from Company A"], answer: 1, explanation: "Resale conflicts with these example terms. Choose an allowed use or seek different terms; do not bypass the policy." } },
  { id: "agreement", label: "Agree", title: "Two decisions. One agreement.", verb: "Initiate the transfer", signal: "CONTRACT NEGOTIATION", focus: "agreement", duration: 14,
    story: "Messages travel in both directions. Once both sides accept, a golden seal forms: an agreement for this asset and these terms.",
    architect: "Connector control planes negotiate and record the agreement. The actual data has still not moved. The central seal is a teaching object, not a central contract server.",
    developer: "DSP contract negotiation proceeds through its protocol states to a finalized agreement. This animation compresses the sequence; it does not show a version-specific wire trace or free-form policy bargaining.",
    takeaway: "Agreeing to share and transferring are separate operations.", message: { agreementId: "demo-agreement-204", assetId: "battery-pcf-demo", parties: ["Company A", "Company B"], state: "Agreement finalized (conceptual)" } },
  { id: "transfer", label: "Transfer", title: "Now the data can travel.", verb: "See the result", signal: "DATA PLANE · PAYLOAD", focus: "consumer", duration: 14,
    story: "An authorized path opens. A copy of the green record travels to Company B. The original core remains with Company A.",
    architect: "The control plane coordinates the transfer using the agreement. The data plane carries the payload. Here we visualize a simplified provider-to-consumer delivery.",
    developer: "Transport varies by transfer type. In an HTTP pull flow, endpoint/reference information enables authorized retrieval through the provider data plane. Animated packets are illustrative, not real encrypted traffic.",
    takeaway: "Control-plane messages organize. Data-plane traffic delivers.", message: { agreementId: "demo-agreement-204", source: "Company A", destination: "Company B", plane: "Data plane", original: "Retained by Company A" },
    question: { prompt: "Which path carries the actual footprint record?", choices: ["The catalogue listing", "The contract seal", "The authorized data-plane path"], answer: 2, explanation: "The catalogue and negotiation exchange metadata and terms. The data plane carries the actual payload." } },
  { id: "use", label: "Use", title: "A shared record becomes useful.", verb: "Complete journey", signal: "BUSINESS VALUE", focus: "consumer", duration: 12,
    story: "Company B’s network lights up. It can now include the battery record in its product-footprint calculation, following the agreed terms.",
    architect: "The receiving application interprets the record with the agreed semantic model. The provider keeps its source; the consumer must respect obligations applying to the received copy.",
    developer: "A connector cannot magically erase or control a delivered copy. Ongoing usage compliance depends on technical controls, auditing and governance. DTR can help discover digital-twin submodels in relevant use cases; it is not mandatory for every transfer.",
    takeaway: "Share data under agreed terms. Create value together.", message: { batteryFootprint: "42.6 kg CO₂e (fictional)", application: "Product-footprint calculation", sourceRetained: true, consumerObligations: "Continue after delivery" },
    question: { prompt: "After delivery, which statement is true?", choices: ["Company A keeps its source; Company B must follow the terms", "The connector can always erase Company B’s copy", "The agreement no longer applies"], answer: 0, explanation: "Source ownership and obligations remain. Compliance after delivery needs appropriate controls and governance—not a magical remote-delete switch." } },
];

export const faults: Record<Fault, { chapter: number; title: string; reason: string; repair: string }> = {
  identity: { chapter: 3, title: "Credential rejected", reason: "The requester cannot establish a trusted identity. The identity bridge stays closed.", repair: "Present a valid trusted credential" },
  policy: { chapter: 4, title: "Purpose mismatch", reason: "Reselling the record conflicts with the offered product-footprint purpose. No agreement is formed.", repair: "Choose product-footprint calculation" },
  offline: { chapter: 6, title: "Data endpoint unavailable", reason: "The agreement exists, but the source cannot be reached. A contract alone cannot deliver data.", repair: "Restore the endpoint and retry" },
};

export type JourneyState = { chapter: number; answered: number[]; attempts: number; choice: number | null; fault: Fault | null; complete: boolean; replay: number };
export const initialJourney: JourneyState = { chapter: 0, answered: [], attempts: 0, choice: null, fault: null, complete: false, replay: 0 };
export type JourneyAction = { type: "next"; guided: boolean } | { type: "go"; chapter: number } | { type: "answer"; choice: number } | { type: "fault"; fault: Fault } | { type: "repair" } | { type: "reset" } | { type: "replay" };
export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case "reset": return { ...initialJourney, replay: state.replay + 1 };
    case "replay": return { ...state, replay: state.replay + 1 };
    case "go": return Number.isInteger(action.chapter) && action.chapter >= 0 && action.chapter < chapters.length ? { ...state, chapter: action.chapter, choice: null, fault: null, complete: false, replay: state.replay + 1 } : state;
    case "fault": return { ...state, chapter: faults[action.fault].chapter, fault: action.fault, complete: false, choice: null, replay: state.replay + 1 };
    case "repair": return { ...state, fault: null, replay: state.replay + 1 };
    case "answer": {
      const question = chapters[state.chapter].question;
      if (state.fault || !question || state.answered.includes(state.chapter) || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= question.choices.length) return state;
      return { ...state, choice: action.choice, attempts: state.attempts + 1, answered: question.answer === action.choice ? [...state.answered, state.chapter] : state.answered };
    }
    case "next":
      if (state.fault || (action.guided && chapters[state.chapter].question && !state.answered.includes(state.chapter))) return state;
      return state.chapter === chapters.length - 1 ? { ...state, complete: true } : { ...state, chapter: state.chapter + 1, choice: null, replay: state.replay + 1 };
  }
}
