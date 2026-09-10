import type { Fault, NodeId } from "./data-journey";

export type SignalKind = "local" | "control" | "retrieval" | "data";
export type JourneyBeat = {
  id: string; title: string; detail: string; focus: NodeId; kind: SignalKind;
  from?: NodeId; to?: NodeId; weight?: number; fault?: Fault;
};
const local = (id: string, title: string, detail: string, focus: NodeId, fault?: Fault): JourneyBeat => ({ id, title, detail, focus, kind: "local", fault });
const send = (id: string, title: string, detail: string, from: NodeId, to: NodeId, kind: SignalKind = "control", weight = 1.4): JourneyBeat => ({ id, title, detail, from, to, focus: to, kind, weight });

/** Ordered teaching beats, not a version-specific DSP wire trace. No parallel messages. */
export const journeySequences: readonly (readonly JourneyBeat[])[] = [
  [
    local("prepare", "Create the record", "Company A prepares a fictional battery footprint record.", "provider"),
    local("describe", "Describe its meaning", "The value, unit and context belong together: 42.6 kg CO₂e.", "provider"),
    local("source-ready", "Keep the source", "The original stays inside Company A. Nothing has been shared.", "provider"),
  ],
  [
    local("configure", "Define the offer", "Company A connects the asset to access and usage policies.", "provider"),
    send("publish", "Make metadata discoverable", "A local configuration step exposes an offer in Company A’s catalogue.", "provider", "catalog", "local"),
    local("published", "Wait for a request", "The offer is available. Company B has not received it yet.", "catalog"),
  ],
  [
    send("catalog-request", "Ask for the catalogue", "Company B asks Company A’s connector for its available offers.", "consumer", "catalog"),
    local("catalog-check", "Check the requester", "Company A checks identity and catalogue access, then selects visible offers.", "catalog"),
    send("catalog-response", "Return visible offers", "Only after the request and checks does Company A return metadata and terms.", "catalog", "consumer"),
    local("offer-found", "Inspect the offer", "Company B can read the offer. The footprint record has not moved.", "consumer"),
  ],
  [
    send("present-identity", "Present identity evidence", "Zoom into a protected interaction: Company B supplies identity evidence.", "consumer", "provider"),
    local("verify-identity", "Verify trust", "The receiving connector checks the evidence against its trust requirements.", "identity", "identity"),
    local("identity-verified", "Establish who is asking", "The identity is trusted. This alone does not grant access to the record.", "identity"),
  ],
  [
    local("review-terms", "Read the offered terms", "Company B reviews the usage terms returned with the offer.", "consumer"),
    local("evaluate-purpose", "Compare the intended use", "Product-footprint calculation fits the example terms; resale does not.", "policy", "policy"),
    local("terms-compatible", "Choose an allowed use", "The intended use is compatible. A contract still has to be agreed.", "policy"),
  ],
  [
    send("contract-request", "Request the offered contract", "Company B sends Company A the selected offer with its unchanged policy.", "consumer", "provider"),
    local("contract-check", "Validate the request", "Company A evaluates the requester and the selected contract policy.", "provider"),
    send("contract-agreement", "Send the agreement", "Company A sends the agreement for Company B to verify.", "provider", "consumer"),
    send("contract-verification", "Confirm verification", "After verifying the agreement, Company B confirms to Company A.", "consumer", "provider"),
    send("contract-finalized", "Finalize the negotiation", "Company A sends the finalization event. The data still stays at its source.", "provider", "consumer"),
    local("seal", "Record the shared agreement", "The golden seal represents the finalized agreement held by the participants.", "agreement"),
  ],
  [
    send("transfer-request", "Request access under the agreement", "Company B starts the transfer process using the finalized agreement.", "consumer", "provider"),
    local("authorize-transfer", "Authorize and prepare access", "Company A validates the agreement and prepares data-plane access.", "provider"),
    send("transfer-ready", "Return access information", "In this simplified HTTP pull example, access information reaches Company B.", "provider", "consumer"),
    send("fetch", "Ask for the actual record", "Company B uses that access information to request the record from the data plane.", "consumer", "provider", "retrieval"),
    local("read-source", "Read the source", "The provider data plane must reach the source before it can return the record.", "provider", "offline"),
    send("payload", "Deliver a copy", "Only now does the green footprint record travel to Company B. The original remains.", "provider", "consumer", "data", 2.4),
  ],
  [
    local("receive", "Start with the received copy", "Delivery happened in the previous chapter. No second transfer starts here.", "consumer"),
    local("interpret", "Interpret the record", "Company B reads the footprint value with its unit and semantic context.", "consumer"),
    local("use-record", "Put the record to work", "The application can use this battery record in a product-footprint calculation.", "consumer"),
    local("value", "Keep the obligations", "The network lights up. The agreed obligations still apply after delivery.", "consumer"),
  ],
];

export const signalStyles: Record<SignalKind, { label: string; color: string }> = {
  local: { label: "Local action", color: "#d0b3ff" },
  control: { label: "Control plane · metadata", color: "#80caff" },
  retrieval: { label: "Data plane · request", color: "#59edcf" },
  data: { label: "Data plane · record", color: "#59edcf" },
};

export function sequenceWindows(chapter: number) {
  const beats = journeySequences[chapter];
  const total = beats.reduce((sum, beat) => sum + (beat.weight ?? 1), 0);
  const gap = .018, available = .84 - gap * (beats.length - 1);
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
  // Failure exploration deliberately opens a labeled snapshot at the failed check.
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
    agreementReady: chapter > 5 || (chapter === 5 && done("contract-finalized")),
    copyVisible: chapter > 6 || (chapter === 6 && !!payload && payload.status !== "upcoming"),
    copyDelivered: chapter > 6 || (chapter === 6 && done("payload")),
    consumerActivated: chapter === 7 && done("use-record"),
    identityVerified: chapter === 3 && done("verify-identity"),
    policyMatched: chapter === 4 && done("evaluate-purpose"),
  };
}

/** The single playback clock feeds captions, WebGL and the schematic alike. */
export function advanceJourneyProgress(progress: number, delta: number, duration: number, speed: number, suspended: boolean) {
  return suspended ? progress : Math.min(1, progress + Math.max(0, Math.min(delta, .25)) * speed / duration);
}
