import type { NodeId } from "./data-journey";
import type { SignalKind } from "./journey-sequence";

export type SceneArtifact = "source" | "offer" | "dsp" | "trust" | "usage" | "agreement" | "edr" | "payload" | "copy";
export type CameraCue = "wide" | "provider" | "consumer" | "center" | "control" | "data";
export type LaneCue = "none" | "control" | "data";

export type DirectedArtifact = {
  id: SceneArtifact;
  title: string;
  detail: string;
  tone: "provider" | "consumer" | "control" | "usage" | "agreement" | "data";
  emphasis: "context" | "active" | "hero";
};

export type DirectedScene = {
  camera: CameraCue;
  lane: LaneCue;
  actor: "provider" | "consumer" | "both";
  artifacts: DirectedArtifact[];
  rail?: { labels: string[]; active: number };
};

const railGroups: Partial<Record<number, { labels: string[]; groups: string[][] }>> = {
  3: {
    labels: ["Ask", "Prove", "Filter", "Return", "See"],
    groups: [["catalog-request"], ["credential-check"], ["access-check"], ["catalog-response"], ["offer-found"]],
  },
  5: {
    labels: ["Request", "Policy", "Agreement", "Verify", "Finalize"],
    groups: [["contract-request"], ["contract-policy-check"], ["contract-agreement"], ["contract-verification"], ["contract-finalized", "seal"]],
  },
  6: {
    labels: ["Transfer", "Authorize", "EDR", "Fetch", "Payload"],
    groups: [["transfer-request"], ["authorize-transfer"], ["transfer-start", "edr-ready"], ["fetch", "read-source"], ["payload"]],
  },
};

function rail(chapter: number, currentId: string) {
  const config = railGroups[chapter];
  if (!config) return undefined;
  const active = Math.max(0, config.groups.findIndex(group => group.includes(currentId)));
  return { labels: config.labels, active };
}

function artifact(id: SceneArtifact, title: string, detail: string, tone: DirectedArtifact["tone"], emphasis: DirectedArtifact["emphasis"] = "active"): DirectedArtifact {
  return { id, title, detail, tone, emphasis };
}

/**
 * Visual story grammar for the conceptual Tractus-X journey.
 * Protocol order remains owned by journey-sequence.ts; this file only decides what the learner sees.
 * Every frame deliberately exposes very few semantic objects so the animation can be understood at a glance.
 */
export function directJourneyScene(chapter: number, currentId: string, kind: SignalKind): DirectedScene {
  const sceneRail = rail(chapter, currentId);

  if (chapter === 0) {
    return {
      camera: "provider",
      lane: "none",
      actor: "provider",
      artifacts: [artifact("source", "Private source", currentId === "describe" ? "42.6 kg CO₂e · meaning attached" : "Battery-footprint record · stays at Company A", "provider", "hero")],
    };
  }

  if (chapter === 1) {
    const policyBeat = currentId === "define-policies";
    return {
      camera: "provider",
      lane: "none",
      actor: "provider",
      artifacts: [
        artifact("source", "Private source", "Record remains inside Company A", "provider", "context"),
        artifact("offer", policyBeat ? "Access + usage rules" : "Provider offer", policyBeat ? "Rules wrap the asset before it can be offered" : "Asset + policies · payload not included", "control", "hero"),
      ],
    };
  }

  if (chapter === 2) {
    const response = currentId === "version-response";
    return {
      camera: currentId === "find-provider" || currentId === "endpoint-ready" ? "consumer" : "control",
      lane: "control",
      actor: currentId === "find-provider" || currentId === "endpoint-ready" ? "consumer" : "both",
      artifacts: [artifact("dsp", "DSP compatibility", response ? "Company A returns supported protocol metadata" : currentId === "endpoint-ready" ? "Compatible endpoint selected" : "Discover before requesting a catalogue", "control", "hero")],
    };
  }

  if (chapter === 3) {
    const checking = currentId === "credential-check" || currentId === "access-check";
    const returning = currentId === "catalog-response" || currentId === "offer-found";
    return {
      camera: checking ? "provider" : returning ? "consumer" : "control",
      lane: "control",
      actor: checking ? "provider" : returning ? "both" : "both",
      rail: sceneRail,
      artifacts: checking
        ? [artifact("trust", currentId === "credential-check" ? "Trust check" : "Access filter", currentId === "credential-check" ? "Verify Company B credentials" : "Only allowed offers may be returned", "control", "hero")]
        : returning
          ? [artifact("offer", "Visible offer", currentId === "catalog-response" ? "Filtered metadata is returning to Company B" : "Company B can see it · data still at Company A", "control", "hero")]
          : [],
    };
  }

  if (chapter === 4) {
    return {
      camera: "consumer",
      lane: "none",
      actor: "consumer",
      artifacts: [
        artifact("offer", "Visible offer", "Battery-footprint offer", "control", "context"),
        artifact("usage", "Usage purpose", currentId === "select-offer" ? "Selected for negotiation · not approved yet" : "Product-footprint use is being compared with the terms", "usage", "hero"),
      ],
    };
  }

  if (chapter === 5) {
    const policy = currentId === "contract-policy-check";
    const agreementExists = ["contract-agreement", "contract-verification", "contract-finalized", "seal"].includes(currentId);
    return {
      camera: policy ? "provider" : "center",
      lane: "control",
      actor: policy ? "provider" : "both",
      rail: sceneRail,
      artifacts: policy
        ? [artifact("usage", "Usage policy", "Company A evaluates the requested use", "usage", "hero")]
        : agreementExists
          ? [artifact("agreement", currentId === "seal" ? "Finalized agreement" : "Contract agreement", currentId === "contract-verification" ? "Company B verifies the shared terms" : currentId === "contract-finalized" || currentId === "seal" ? "Shared control-plane agreement · no payload yet" : "Company A sends the agreement to Company B", "agreement", "hero")]
          : [],
    };
  }

  if (chapter === 6) {
    const edrBeat = currentId === "transfer-start" || currentId === "edr-ready";
    const dataBeat = kind === "retrieval" || kind === "data" || currentId === "read-source";
    return {
      camera: dataBeat ? "data" : "control",
      lane: dataBeat ? "data" : "control",
      actor: "both",
      rail: sceneRail,
      artifacts: edrBeat
        ? [artifact("edr", "EDR · access key", "Endpoint + authorization · not the payload", "control", "hero")]
        : currentId === "payload"
          ? [artifact("payload", "Actual payload", "Only now does the battery record cross to Company B", "data", "hero")]
          : currentId === "read-source"
            ? [artifact("source", "Private source", "Provider data plane reads Company A's backend", "provider", "hero")]
            : [],
    };
  }

  return {
    camera: "consumer",
    lane: "none",
    actor: "consumer",
    artifacts: [
      artifact("copy", "Received copy", "42.6 kg CO₂e becomes business input", "data", "hero"),
      artifact("agreement", "Obligations continue", "Governance survives the transfer", "agreement", "context"),
    ],
  };
}

export const directorArtifactOwners: Partial<Record<SceneArtifact, NodeId>> = {
  source: "provider",
  offer: "catalog",
  trust: "identity",
  usage: "policy",
  agreement: "agreement",
  copy: "consumer",
};
