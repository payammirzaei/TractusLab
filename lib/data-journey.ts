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
  provider: { label: "Company A", role: "Supplier · Provider", description: "The provider owns the battery-footprint source. Its connector exposes offers, negotiates agreements and authorizes data-plane access without publishing the private source itself.", position: [-5, 0, 0], color: "#59edcf" },
  consumer: { label: "Company B", role: "Manufacturer · Consumer", description: "The consumer needs the supplier’s battery footprint. Its connector discovers the provider, requests the catalogue, negotiates an agreement and later uses an EDR to access the data plane.", position: [5, 0, 0], color: "#a5a0ff" },
  catalog: { label: "Data offer", role: "Provider catalogue", description: "The provider catalogue contains descriptions and offers that passed the requester’s access-policy check. It is not a central Tractus-X warehouse and it does not contain the private source record.", position: [-2.8, 2.1, 0], color: "#79bfff" },
  identity: { label: "Trust check", role: "VC + access policy", description: "During protected connector interactions, the provider evaluates participant credentials and access policy. In this journey the check is shown inside the catalogue exchange, where it actually affects offer visibility.", position: [-2.8, .8, .2], color: "#75dbff" },
  policy: { label: "Usage terms", role: "Contract policy", description: "Usage or contract policy describes the conditions under which contract negotiation may succeed. In this journey Company B reviews the terms first; Company A evaluates them during negotiation.", position: [2.8, 2.1, 0], color: "#ffba77" },
  agreement: { label: "Agreement", role: "Finalized contract", description: "The connector control planes record a finalized agreement for a specific offer. This authorizes the next step, but it is still separate from moving the actual payload.", position: [0, .7, .5], color: "#f5d786" },
};

export const chapters: Chapter[] = [
  { id: "asset", label: "Prepare", title: "The data starts inside one company.", verb: "Publish the offer", signal: "PRIVATE SOURCE", focus: "provider", duration: 9,
    story: "Company A already has a battery-footprint record in its own environment. Company B will eventually need a copy, but nothing is shared yet.",
    architect: "The provider connector references the source through an asset and private data address. The semantic meaning travels with the record conceptually, while the source stays under Company A’s control.",
    developer: "The asset identifies what may be offered. The private data address tells the provider data plane how to reach the backend. The fictional 42.6 kg CO₂e value is teaching data, not a normative PCF payload.",
    takeaway: "Data sharing starts with a private source, not a central dataspace database.", message: { assetId: "battery-pcf-demo", battery: "BAT-204", footprint: 42.6, unit: "kg CO₂e", source: "Company A private backend", classification: "Fictional teaching record" } },
  { id: "publish", label: "Publish", title: "Publish an offer, not the payload.", verb: "Find the connector", signal: "OFFER CONFIGURATION", focus: "catalog", duration: 11,
    story: "Company A connects its asset to access and usage policies, then exposes an eligible offer through its own catalogue. The source remains private.",
    architect: "Asset + access policy + usage/contract policy + contract definition describe what is offered and to whom. Catalogue visibility is determined later per requester.",
    developer: "The provider creates policy definitions and a contract definition that selects the asset. A catalogue response can later materialize a Data Offer from that definition after the access-policy check.",
    takeaway: "Publishing means making terms discoverable, not uploading the data into the dataspace.", message: { assetId: "battery-pcf-demo", accessPolicy: "Trusted partner", usagePolicy: "Product-footprint calculation", contractDefinition: "battery-pcf-offer", payloadIncluded: false },
    question: { prompt: "What has Company A exposed at this point?", choices: ["The private battery record itself", "An offer configuration describing what may be requested", "Company A’s backend credentials"], answer: 1, explanation: "The connector exposes an offer path and terms. The private source and credentials stay inside Company A." } },
  { id: "connector", label: "Connect", title: "Before asking for data, find the connector.", verb: "Request the catalogue", signal: "DSP DISCOVERY", focus: "consumer", duration: 12,
    story: "Company B first discovers how to talk to Company A’s connector and which Dataspace Protocol version it supports. Only then is the catalogue request prepared.",
    architect: "DSP 2025-1 defines connector version discovery through a public well-known endpoint. Tractus-X can also resolve participant connector information through its discovery mechanisms.",
    developer: "Conceptually: identify the provider connector → discover supported DSP versions → select the compatible protocol endpoint. This journey visualizes the 2025-1 well-known discovery before the catalogue request.",
    takeaway: "Find a compatible connector before starting the exchange.", message: { participant: "Company A", discovery: "/.well-known/dspace-version", selectedProtocol: "DSP 2025-1", next: "Catalogue request" },
    question: { prompt: "Why does Company B discover the connector first?", choices: ["To download the record early", "To learn which compatible DSP endpoint/version to use", "To bypass the provider catalogue"], answer: 1, explanation: "Connector discovery tells Company B how to address the provider using a supported Dataspace Protocol version." } },
  { id: "catalog", label: "Discover", title: "Ask. Prove. Filter. Return.", verb: "Choose the terms", signal: "CATALOGUE + ACCESS CHECK", focus: "catalog", duration: 17,
    story: "Company B asks Company A for its catalogue. Company A checks the participant credentials and access policy. Only offers the requester may see are returned.",
    architect: "The consumer starts the catalogue request from its own control plane. The provider collects the consumer’s verifiable credentials and evaluates each relevant access policy before constructing the visible Data Offers.",
    developer: "This chapter intentionally keeps credential verification inside the catalogue exchange instead of inventing a later standalone identity round. Access policy controls catalogue visibility; it is distinct from usage/contract policy.",
    takeaway: "The catalogue is requester-aware: identity and access checks happen before the offer comes back.", message: { request: "CatalogRequest", requester: "Company B", credentialCheck: "VC evaluated", accessPolicy: "Passed", result: "battery-pcf-demo Data Offer", payloadIncluded: false },
    question: { prompt: "When does Company A apply the access policy?", choices: ["While building the catalogue response for Company B", "Only after the data has been delivered", "After Company B calculates its product footprint"], answer: 0, explanation: "The provider checks the requester against access policy during catalogue retrieval and only exposes eligible offers." } },
  { id: "terms", label: "Choose", title: "Company B understands what it is asking for.", verb: "Negotiate the agreement", signal: "OFFER SELECTION", focus: "policy", duration: 11,
    story: "Company B reads the returned offer and chooses the battery-footprint dataset because the offered usage terms match its intended product-footprint calculation.",
    architect: "The consumer can inspect the usage/contract policy before negotiation. This is a decision to request the offer, not the provider’s final policy enforcement step.",
    developer: "UsagePurpose and FrameworkAgreement-style constraints belong to usage/contract policy. The authoritative provider-side evaluation happens when the contract request is negotiated in the next chapter.",
    takeaway: "Review first. Enforcement happens during negotiation.", message: { offer: "battery-pcf-demo", intendedUse: "Product-footprint calculation", consumerDecision: "Select offer", providerEvaluation: "Not yet" },
    question: { prompt: "Company B sees compatible terms. What does that mean?", choices: ["The contract is already finalized", "It can select the offer and start negotiation", "The payload may move immediately"], answer: 1, explanation: "Choosing compatible terms only prepares the contract request. The provider still evaluates the contract policy during negotiation." } },
  { id: "agreement", label: "Agree", title: "Agreement happens on the control plane.", verb: "Start the transfer", signal: "CONTRACT NEGOTIATION", focus: "agreement", duration: 19,
    story: "Company B requests the selected offer. Company A evaluates the contract policy, sends an agreement, Company B verifies it, and Company A finalizes the negotiation. No payload has moved.",
    architect: "The control planes execute the DSP contract-negotiation state machine and record the finalized agreement. Usage-policy constraints are evaluated here on the provider side.",
    developer: "The teaching sequence is Request → provider policy evaluation → Agreement → consumer Verification → provider Finalization. It compresses protocol detail while preserving the causal order that matters for learning.",
    takeaway: "A finalized agreement authorizes the next step; it is not the data transfer itself.", message: { negotiation: "DSP contract negotiation", agreementId: "demo-agreement-204", assetId: "battery-pcf-demo", state: "FINALIZED", payloadTransferred: false },
    question: { prompt: "When is the usage/contract policy enforced in this journey?", choices: ["During catalogue visibility filtering", "During the provider’s contract-negotiation evaluation", "Only after the payload arrives"], answer: 1, explanation: "Catalogue visibility uses access policy. Usage/contract policy is evaluated during contract negotiation." } },
  { id: "transfer", label: "Transfer", title: "First the key. Then the data.", verb: "Use the record", signal: "TRANSFER START → EDR → DATA", focus: "consumer", duration: 23,
    story: "Company B starts a transfer under the finalized agreement. When the transfer process reaches STARTED, Company A provides an Endpoint Data Reference. Company B then uses that endpoint and authorization to fetch the actual record.",
    architect: "Control-plane transfer setup produces the EDR. The EDR contains the information needed for authorized data access. Only the following data-plane request reaches the provider data plane and source.",
    developer: "HTTP pull example: TransferRequest → provider authorization → transfer STARTED / EDR → consumer GET with endpoint + authorization → provider data plane reads backend → payload response. The EDR is not the payload.",
    takeaway: "EDR unlocks the data plane; it is not the data itself.", message: { agreementId: "demo-agreement-204", transferState: "STARTED", edr: { endpoint: "https://provider-data-plane.example/public", authorization: "Bearer <token>" }, actualPayload: "Fetched only afterwards" },
    question: { prompt: "What does Company B receive before it fetches the actual record?", choices: ["A copy of Company A’s whole database", "An EDR with endpoint and authorization information", "A second contract agreement"], answer: 1, explanation: "The EDR gives Company B authorized data-plane access information. The actual record is fetched afterwards." } },
  { id: "use", label: "Use", title: "The copy becomes business value.", verb: "Complete journey", signal: "BUSINESS USE", focus: "consumer", duration: 12,
    story: "The received battery-footprint copy reaches Company B’s application and can be used in its product-footprint calculation. Company A still keeps the original source.",
    architect: "The consumer application interprets the received data under the agreed semantics and obligations. The dataspace enabled governed access; it did not relocate the provider’s system of record.",
    developer: "A connector cannot magically control every downstream action after delivery. Continued compliance depends on technical controls, auditability, governance and the obligations in the agreement.",
    takeaway: "The source stays with Company A. A governed copy creates value at Company B.", message: { batteryFootprint: "42.6 kg CO₂e (fictional)", application: "Product-footprint calculation", providerSourceRetained: true, obligationsContinue: true },
    question: { prompt: "After delivery, which statement is true?", choices: ["Company A keeps its source and Company B uses an authorized copy", "The provider source moved into Company B", "The agreement disappears when the GET request finishes"], answer: 0, explanation: "The provider remains the source owner. Company B receives and uses a governed copy under the agreed conditions." } },
];

export const faults: Record<Fault, { chapter: number; title: string; reason: string; repair: string }> = {
  identity: { chapter: 3, title: "Catalogue access rejected", reason: "Company B’s credential or access-policy check fails while Company A is constructing the requester-specific catalogue.", repair: "Use a trusted credential and retry" },
  policy: { chapter: 5, title: "Contract policy rejected", reason: "Company B requests a use that does not satisfy Company A’s usage/contract policy. The negotiation cannot reach FINALIZED.", repair: "Choose an allowed usage purpose" },
  offline: { chapter: 6, title: "Provider data source unavailable", reason: "The agreement and EDR can exist, but the provider data plane cannot read the backend source. No payload can be returned.", repair: "Restore the source and retry" },
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
