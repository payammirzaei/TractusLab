import type { Fault, NodeId } from "./data-journey";

export type SignalKind = "local" | "control" | "retrieval" | "data";
export type JourneyBeat = {
  id: string; title: string; detail: string; focus: NodeId; kind: SignalKind;
  from?: NodeId; to?: NodeId; weight?: number; fault?: Fault;
};
const local = (id: string, title: string, detail: string, focus: NodeId, fault?: Fault): JourneyBeat => ({ id, title, detail, focus, kind: "local", fault });
const send = (id: string, title: string, detail: string, from: NodeId, to: NodeId, kind: SignalKind = "control", weight = 1.4): JourneyBeat => ({ id, title, detail, from, to, focus: to, kind, weight });

/** Ordered teaching beats. They preserve Tractus-X/DSP causal order without pretending to be a complete wire trace. */
export const journeySequences: readonly (readonly JourneyBeat[])[] = [
  [
    local("prepare", "Create the source record", "Company A prepares the fictional battery-footprint record in its own environment.", "provider"),
    local("describe", "Attach meaning", "Value, unit and semantic context belong together: 42.6 kg CO₂e.", "provider"),
    local("source-ready", "Keep the source private", "Nothing has crossed the dataspace boundary yet.", "provider"),
  ],
  [
    local("register-asset", "Register the asset", "Company A’s connector references the private source through an asset.", "provider"),
    local("define-policies", "Define access and usage policies", "Access policy controls offer visibility; usage policy governs contract eligibility.", "policy"),
    local("publish-offer", "Create the contract definition", "The asset and policies form the provider-side offer configuration.", "catalog"),
    local("offer-ready", "Wait for a consumer", "The offer can be materialized in a requester-specific catalogue later. No payload has moved.", "catalog"),
  ],
  [
    local("find-provider", "Identify Company A", "Company B knows which participant it wants to contact.", "consumer"),
    send("version-request", "Discover supported DSP versions", "Company B checks the provider connector’s public protocol-version metadata before requesting a catalogue.", "consumer", "provider"),
    send("version-response", "Return compatible protocol metadata", "Company A exposes the supported Dataspace Protocol versions and endpoint information.", "provider", "consumer"),
    local("endpoint-ready", "Select the connector endpoint", "Company B now knows how to address the catalogue request using a compatible DSP version.", "consumer"),
  ],
  [
    send("catalog-request", "Request the catalogue", "Company B starts the catalogue request from its own control plane toward Company A.", "consumer", "provider"),
    local("credential-check", "Verify participant credentials", "Company A evaluates Company B’s verifiable credentials as part of the protected catalogue interaction.", "identity", "identity"),
    local("access-check", "Apply the access policy", "Company A checks which contract definitions Company B is allowed to see.", "identity"),
    send("catalog-response", "Return visible offers", "Only after credential and access-policy checks does Company A return the requester-visible Data Offers.", "provider", "consumer"),
    local("offer-found", "Inspect the returned offer", "Company B can see the battery-footprint offer. The actual record is still at Company A.", "catalog"),
  ],
  [
    local("review-offer", "Read the offered terms", "Company B inspects the returned usage/contract policy before it asks for an agreement.", "consumer"),
    local("compare-purpose", "Compare intended use", "Product-footprint calculation fits the example offer; the consumer chooses that allowed purpose.", "policy"),
    local("select-offer", "Select the offer", "Company B is ready to negotiate. The provider has not yet accepted the usage policy.", "consumer"),
  ],
  [
    send("contract-request", "Request the selected contract", "Company B sends a contract request for the selected offer.", "consumer", "provider"),
    local("contract-policy-check", "Evaluate the usage policy", "Company A evaluates Company B’s request against the usage/contract policy.", "policy", "policy"),
    send("contract-agreement", "Send the agreement", "After the policy check succeeds, Company A sends the agreement to Company B.", "provider", "consumer"),
    send("contract-verification", "Verify the agreement", "Company B verifies the agreement and confirms that verification to Company A.", "consumer", "provider"),
    send("contract-finalized", "Finalize the negotiation", "Company A sends the finalization event. The payload still has not moved.", "provider", "consumer"),
    local("seal", "Record the finalized agreement", "The gold agreement object represents the finalized contract held by the participants.", "agreement"),
  ],
  [
    send("transfer-request", "Start a transfer under the agreement", "Company B starts the transfer process using the finalized contract agreement.", "consumer", "provider"),
    local("authorize-transfer", "Authorize the transfer", "Company A validates the agreement and prepares authorized data-plane access.", "provider"),
    send("transfer-start", "Send the EDR", "When the transfer reaches STARTED, Company A sends endpoint and authorization information to Company B as an EDR.", "provider", "consumer"),
    local("edr-ready", "Store the access reference", "Company B now has the Endpoint Data Reference. It still does not have the battery record itself.", "consumer"),
    send("fetch", "Use the EDR to request the data", "Company B calls the provider data plane using the EDR endpoint and authorization.", "consumer", "provider", "retrieval"),
    local("read-source", "Read Company A’s backend", "The provider data plane reaches the private source before it can answer the request.", "provider", "offline"),
    send("payload", "Return the actual record", "Only now does the green battery-footprint copy travel to Company B. Company A keeps the source.", "provider", "consumer", "data", 2.4),
  ],
  [
    local("receive", "Start with the received copy", "The payload arrived in the previous chapter; no second data transfer starts here.", "consumer"),
    local("interpret", "Interpret the record", "Company B reads the value with the expected unit and semantic context.", "consumer"),
    local("use-record", "Use it in the business application", "The received battery footprint becomes an input to Company B’s product-footprint calculation.", "consumer"),
    local("value", "Keep the obligations", "Business value appears, while the agreement’s obligations continue to matter after delivery.", "consumer"),
  ],
];

export const signalStyles: Record<SignalKind, { label: string; color: string }> = {
  local: { label: "Local action", color: "#d0b3ff" },
  control: { label: "Control plane · DSP", color: "#80caff" },
  retrieval: { label: "Data plane · authorized request", color: "#59edcf" },
  data: { label: "Data plane · payload", color: "#59edcf" },
};

export function sequenceWindows(chapter: number) {
  const beats = journeySequences[chapter];
  const total = beats.reduce((sum, beat) => sum + (beat.weight ?? 1), 0);
  const gap = .014, available = .85 - gap * (beats.length - 1);
  let cursor = .025;
  return beats.map(beat => {
    const start = cursor, end = start + available * (beat.weight ?? 1) / total;
    cursor = end + gap;
    return { ...beat, start, end };
  });
}
export type BeatStatus = "upcoming" | "active" | "done" | "blocked";

export function sequenceFrame(chapter: number, progress: number, fault: Fault | null = null) {
  const windows = sequenceWindows(chapter);
  const failure = windows.find(beat => beat.fault && beat.fault === fault);
  const position = failure ? (failure.start + failure.end) / 2 : Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const beats = windows.map(beat => ({
    ...beat,
    status: (beat === failure ? "blocked" : position >= beat.end ? "done" : position >= beat.start ? "active" : "upcoming") as BeatStatus,
    fraction: Math.max(0, Math.min(1, (position - beat.start) / (beat.end - beat.start))),
  }));
  const current = beats.find(beat => beat.status === "active" || beat.status === "blocked")
    ?? beats.find(beat => beat.status === "upcoming") ?? beats[beats.length - 1];
  const finished = !failure && beats.every(beat => beat.status === "done");
  const done = (id: string) => beats.some(beat => beat.id === id && beat.status === "done");
  const payload = beats.find(beat => beat.id === "payload");
  return {
    beats, current, position, finished, blocked: !!failure,
    successAt: windows[windows.length - 1].end,
    connectorReady: chapter > 2 || (chapter === 2 && done("endpoint-ready")),
    catalogReady: chapter > 3 || (chapter === 3 && done("catalog-response")),
    agreementReady: chapter > 5 || (chapter === 5 && done("contract-finalized")),
    edrReady: chapter > 6 || (chapter === 6 && done("transfer-start")),
    copyVisible: chapter > 6 || (chapter === 6 && !!payload && payload.status !== "upcoming"),
    copyDelivered: chapter > 6 || (chapter === 6 && done("payload")),
    consumerActivated: chapter === 7 && done("use-record"),
    identityVerified: chapter > 3 || (chapter === 3 && done("credential-check")),
    policyMatched: chapter > 5 || (chapter === 5 && done("contract-policy-check")),
  };
}

/** The single playback clock feeds captions, WebGL and the schematic alike. */
export function advanceJourneyProgress(progress: number, delta: number, duration: number, speed: number, suspended: boolean) {
  return suspended ? progress : Math.min(1, progress + Math.max(0, Math.min(delta, .25)) * speed / duration);
}
