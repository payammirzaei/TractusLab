import type { SignalKind } from "./journey-sequence";

export type EdcPoint =
  | "provider-system"
  | "provider-source"
  | "provider-control"
  | "provider-data"
  | "consumer-control"
  | "consumer-data"
  | "consumer-system";

export type EdcRoute = {
  mode: "none" | "local" | "control" | "data" | "payload";
  points: EdcPoint[];
  label: string;
};

const none = (label: string): EdcRoute => ({ mode: "none", points: [], label });
const route = (mode: EdcRoute["mode"], label: string, ...points: EdcPoint[]): EdcRoute => ({ mode, points, label });

/**
 * Presentation topology for the conceptual Tractus-X EDC story.
 * It intentionally keeps business systems and connectors separate:
 * company systems never exchange DSP/control traffic directly with each other.
 */
export function edcRouteForBeat(chapter: number, currentId: string, kind: SignalKind): EdcRoute {
  if (chapter === 0) {
    return currentId === "describe"
      ? route("local", "Company A describes its private record", "provider-source", "provider-system")
      : none("The source stays inside Company A");
  }

  if (chapter === 1) {
    if (currentId === "register-asset") return route("local", "Company A registers the source with its Provider EDC", "provider-source", "provider-control");
    return none("Provider EDC prepares the offer locally");
  }

  if (chapter === 2) {
    if (currentId === "version-request") return route("control", "Consumer EDC discovers Provider EDC DSP versions", "consumer-control", "provider-control");
    if (currentId === "version-response") return route("control", "Provider EDC returns compatible DSP metadata", "provider-control", "consumer-control");
    return none("Consumer EDC prepares the connector endpoint");
  }

  if (chapter === 3) {
    if (currentId === "catalog-request") return route("control", "Consumer EDC requests Provider EDC catalogue", "consumer-control", "provider-control");
    if (currentId === "catalog-response") return route("control", "Provider EDC returns requester-visible offers", "provider-control", "consumer-control");
    return none("Provider EDC evaluates the catalogue request internally");
  }

  if (chapter === 4) {
    return currentId === "select-offer"
      ? route("local", "Company B selects an offer exposed by its Consumer EDC", "consumer-control", "consumer-system")
      : none("Company B inspects the offer through its Consumer EDC");
  }

  if (chapter === 5) {
    if (currentId === "contract-request") return route("control", "Consumer EDC requests the selected contract", "consumer-control", "provider-control");
    if (currentId === "contract-agreement") return route("control", "Provider EDC sends the agreement", "provider-control", "consumer-control");
    if (currentId === "contract-verification") return route("control", "Consumer EDC verifies the agreement", "consumer-control", "provider-control");
    if (currentId === "contract-finalized") return route("control", "Provider EDC finalizes the negotiation", "provider-control", "consumer-control");
    return none("The contract state is handled in the EDC control plane");
  }

  if (chapter === 6) {
    if (currentId === "transfer-request") return route("control", "Consumer EDC starts transfer under the agreement", "consumer-control", "provider-control");
    if (currentId === "transfer-start") return route("control", "Provider EDC sends the EDR to Consumer EDC", "provider-control", "consumer-control");
    if (currentId === "fetch") return route("data", "Consumer EDC data plane requests the record", "consumer-data", "provider-data");
    if (currentId === "read-source") return route("local", "Provider EDC data plane reads Company A's source", "provider-data", "provider-source");
    if (currentId === "payload") {
      return route(
        "payload",
        "Actual payload crosses through the EDC data planes",
        "provider-source",
        "provider-data",
        "consumer-data",
        "consumer-system",
      );
    }
    return none(kind === "retrieval" || kind === "data" ? "EDC data plane is active" : "EDC control plane is active");
  }

  return currentId === "use-record"
    ? route("local", "Company B consumes the received copy", "consumer-data", "consumer-system")
    : none("The received copy stays inside Company B");
}

export const edcTopologyOrder: EdcPoint[] = [
  "provider-system",
  "provider-source",
  "provider-control",
  "provider-data",
  "consumer-control",
  "consumer-data",
  "consumer-system",
];
