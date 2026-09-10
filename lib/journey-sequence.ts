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
    local("prepare", "Create the source record", "Company A prepares the fictional battery-footprint record inside its own business environment.", "provider"),
    local("describe", "Attach meaning", "Value, unit and semantic context belong together: 42.6 kg CO₂e.", "provider"),
    local("source-ready", "Keep the source private", "Nothing has entered the Tractus-X exchange yet. The source remains inside Company A.", "provider"),
  ],
  [
    local("register-asset", "Register the source with Provider EDC", "Company A configures its Tractus-X Provider EDC to reference the private source through an asset.", "provider"),
    local("define-policies", "Define policies in Provider EDC", "The Provider EDC combines access and usage policies with the asset configuration.", "policy"),
    local("publish-offer", "Create the Provider EDC contract definition", "Inside the Tractus-X Provider EDC, asset plus policies become the offer configuration.", "catalog"),
    local("offer-ready", "Provider EDC is ready for a requester", "The offer can later appear in a requester-specific catalogue. No payload has moved.", "catalog"),
  ],
  [
    local("find-provider", "Company B selects Company A's connector", "Company B knows which participant it wants to contact through its own Consumer EDC.", "consumer"),
    send("version-request", "Consumer EDC discovers Provider EDC DSP versions", "The Tractus-X Consumer EDC checks the Provider EDC's public protocol-version metadata before requesting a catalogue.", "consumer", "provider"),
    send("version-response", "Provider EDC returns compatible DSP metadata", "The Provider EDC exposes supported Dataspace Protocol versions and endpoint information to the Consumer EDC.", "provider", "consumer"),
    local("endpoint-ready", "Consumer EDC selects the connector endpoint", "The Consumer EDC now knows how to address the Provider EDC with a compatible DSP version.", "consumer"),
  ],
  [
    send("catalog-request", "Consumer EDC requests Provider EDC catalogue", "The catalogue request travels from Company B's Tractus-X Consumer EDC to Company A's Provider EDC control plane.", "consumer", "provider"),
    local("credential-check", "Provider EDC verifies participant credentials", "The Provider EDC evaluates Company B's verifiable credentials inside the protected catalogue interaction.", "identity", "identity"),
    local("access-check", "Provider EDC applies the access policy", "The Provider EDC decides which contract definitions this Consumer EDC is allowed to see.", "identity"),
    send("catalog-response", "Provider EDC returns visible offers", "Only after credential and access-policy checks does the Provider EDC return requester-visible Data Offers to the Consumer EDC.", "provider", "consumer"),
    local("offer-found", "Consumer EDC exposes the returned offer", "Company B can inspect the battery-footprint offer through its Consumer EDC. The actual record is still at Company A.", "catalog"),
  ],
  [
    local("review-offer", "Company B reads the offer through Consumer EDC", "Company B inspects the returned usage/contract policy before asking its Consumer EDC to negotiate.", "consumer"),
    local("compare-purpose", "Compare intended use with the offered policy", "Product-footprint calculation fits the example offer; Company B chooses that intended purpose.", "policy"),
    local("select-offer", "Consumer EDC selects the offer for negotiation", "The Consumer EDC is ready to negotiate. The Provider EDC has not yet accepted the requested usage.", "consumer"),
  ],
  [
    send("contract-request", "Consumer EDC requests the selected contract", "Company B's Consumer EDC sends the contract request to Company A's Provider EDC.", "consumer", "provider"),
    local("contract-policy-check", "Provider EDC evaluates the usage policy", "The Provider EDC checks Company B's requested use against the usage/contract policy.", "policy", "policy"),
    send("contract-agreement", "Provider EDC sends the agreement", "After the policy check succeeds, the Provider EDC sends the agreement to the Consumer EDC.", "provider", "consumer"),
    send("contract-verification", "Consumer EDC verifies the agreement", "The Consumer EDC verifies the shared terms and confirms that verification to the Provider EDC.", "consumer", "provider"),
    send("contract-finalized", "Provider EDC finalizes the negotiation", "The Provider EDC sends finalization. The payload still has not moved.", "provider", "consumer"),
    local("seal", "Both EDCs retain the finalized agreement", "The gold agreement represents the finalized contract state used by the Tractus-X connectors.", "agreement"),
  ],
  [
    send("transfer-request", "Consumer EDC starts transfer under the agreement", "The Consumer EDC starts the transfer process using the finalized contract agreement.", "consumer", "provider"),
    local("authorize-transfer", "Provider EDC authorizes data access", "The Provider EDC validates the agreement and prepares authorized data-plane access.", "provider"),
    send("transfer-start", "Provider EDC sends the EDR", "When transfer reaches STARTED, the Provider EDC sends endpoint and authorization information to the Consumer EDC as an EDR.", "provider", "consumer"),
    local("edr-ready", "Consumer EDC stores the EDR", "The Consumer EDC now has the Endpoint Data Reference. It still does not have the battery record itself.", "consumer"),
    send("fetch", "Consumer EDC data plane requests the record", "The Consumer EDC uses the EDR endpoint and authorization to call the Provider EDC data plane.", "consumer", "provider", "retrieval"),
    local("read-source", "Provider EDC data plane reads Company A's source", "The Provider EDC data plane reaches the private backend before it can answer the authorized request.", "provider", "offline"),
    send("payload", "Actual record crosses through the EDC data planes", "Only now does the green battery-footprint copy travel from Company A's source through Provider EDC and Consumer EDC to Company B. Company A keeps the original.", "provider", "consumer", "data", 2.4),
  ],
  [
    local("receive", "Company B receives the copy from Consumer EDC", "The payload arrived through the Consumer EDC in the previous chapter; no second transfer starts here.", "consumer"),
    local("interpret", "Company B interprets the received record", "The business application reads the value with the expected unit and semantic context.", "consumer"),
    local("use-record", "Use the copy in Company B's business application", "The received battery footprint becomes an input to Company B's product-footprint calculation.", "consumer"),
    local("value", "Keep the agreement obligations", "Business value appears while the Tractus-X agreement obligations continue to matter after delivery.", "consumer"),
  ],
];

export const signalStyles: Record<SignalKind, { label: string; color: string }> = {
  local: { label: "Local action", color: "#d0b3ff" },
  control: { label: "EDC control plane · DSP", color: "#80caff" },
  retrieval: { label: "EDC data plane · authorized request", color: "#59edcf" },
  data: { label: "EDC data plane · payload", color: "#59edcf" },
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
