import type { LearningScenario, ScenarioStep } from "./simulator";

const flagshipLessonEnhancements: Record<string, Partial<ScenarioStep>> = {
  "why-dataspace": {
    simpleExplanation: "Two companies want to exchange useful data without merging their systems or giving up control. A dataspace gives them a shared, governed way to do that.",
    architectureHint: "Keep both companies independent. The shared layer coordinates trust, rules and exchange; it does not become a central business database.",
    realWorldExample: "A battery supplier shares a product carbon footprint with an OEM, while the source calculation and internal ERP stay inside the supplier company.",
    keyTakeaway: "A dataspace connects independent companies without taking ownership of their data.",
    challenge: {
      id: "lesson-dataspace-purpose",
      kind: "multiple-choice",
      prompt: "Which statement best describes why the two companies use a dataspace?",
      hint: "Think about collaboration without centralizing ownership.",
      relevantConcept: "Data Space",
      correctExplanation: "Exactly. The companies collaborate through shared rules while each participant keeps control of its own systems and data.",
      wrongExplanation: "A dataspace is not a shared ERP or a public file server. Its value is governed exchange between independent participants.",
      takeaway: "Governed exchange, independent ownership.",
      options: [
        { id: "central-db", label: "Move both companies into one shared database", explanation: "That removes the independence and sovereignty the dataspace is meant to preserve.", concept: "Data sovereignty" },
        { id: "governed-exchange", label: "Exchange data through shared rules while each company keeps control", explanation: "Correct: collaboration happens without centralizing ownership.", concept: "Data Space" },
        { id: "public-files", label: "Publish all partner data on a public file server", explanation: "That would remove controlled access and usage conditions.", concept: "Access control" },
      ],
      correctOptionIds: ["governed-exchange"],
    },
  },
  identity: {
    simpleExplanation: "Before the supplier shows protected offers or data, it needs to know which company is asking and whether that participant is trusted.",
    architectureHint: "Identity is checked before offer-specific policy decisions. Trust establishes who the participant is; policy decides what that participant may do.",
    realWorldExample: "The OEM connector identifies itself as the vehicle manufacturer before the battery supplier exposes partner-only PCF offers.",
    keyTakeaway: "Identity answers who is on the other side; policy answers what that participant may use.",
    challenge: {
      id: "lesson-identity-decision",
      kind: "scenario-decision",
      prompt: "A new partner asks for a protected battery PCF offer. What should happen first?",
      hint: "Do not decide permissions before you know who is asking.",
      relevantConcept: "Identity & Trust",
      correctExplanation: "Right. Establish the participant identity and trust context before applying offer-specific access or usage rules.",
      wrongExplanation: "The supplier should not expose protected data or negotiate usage conditions with an unknown participant.",
      takeaway: "Trust first, then authorization and policy.",
      options: [
        { id: "verify", label: "Verify the participant identity and trust context", explanation: "Correct. The provider needs a trusted participant context first.", concept: "Identity & Trust" },
        { id: "transfer", label: "Start the data transfer immediately", explanation: "Transfer comes much later, after identity, discovery, policy and agreement.", concept: "Data Transfer" },
        { id: "email", label: "Email the protected dataset and verify later", explanation: "That bypasses the governed exchange completely.", concept: "Governed exchange" },
      ],
      correctOptionIds: ["verify"],
    },
  },
  catalog: {
    simpleExplanation: "The consumer first discovers what the provider is willing to offer. It sees metadata and conditions, not the protected business payload itself.",
    architectureHint: "The consumer connector requests the provider catalog through the connector layer. Discovery is separate from the later transfer of protected data.",
    realWorldExample: "The OEM sees an offer called Product Carbon Footprint for BAT-12345 before any CO₂ payload is transferred.",
    keyTakeaway: "Discover the offer before requesting the data.",
    challenge: {
      id: "lesson-catalog-component",
      kind: "component-select",
      prompt: "Which component should the manufacturer use to discover the supplier's governed data offers?",
      hint: "Choose the component responsible for dataspace communication, not the ERP or the final application UI.",
      relevantConcept: "EDC / Connector",
      correctExplanation: "Correct. The consumer connector requests the provider catalog and receives the available offers and their policy context.",
      wrongExplanation: "Catalog discovery belongs to the connector interaction. The ERP or frontend may trigger it, but they are not the dataspace exchange component.",
      takeaway: "The connector is the governed entry point for offer discovery.",
      options: [
        { id: "consumer-edc", label: "Consumer EDC / Connector", explanation: "Correct. It requests the provider catalog.", concept: "EDC" },
        { id: "erp", label: "Manufacturer ERP database", explanation: "The ERP can need the data, but it does not perform the dataspace catalog protocol itself.", concept: "System boundary" },
        { id: "dashboard", label: "Learning dashboard", explanation: "The UI can visualize state, but it is not the exchange connector.", concept: "Architecture responsibility" },
      ],
      correctOptionIds: ["consumer-edc"],
    },
  },
  semantics: {
    simpleExplanation: "Moving JSON is not enough. Both companies must agree on what each field, identifier and unit means.",
    architectureHint: "Connectivity and semantics are separate responsibilities: connectors move governed data; semantic models make the payload interoperable.",
    realWorldExample: "Both companies interpret the PCF value, unit, product identifier and calculation fields using the same model version.",
    keyTakeaway: "Interoperability needs shared meaning, not only working APIs.",
    challenge: {
      id: "lesson-semantic-architecture",
      kind: "architecture-select",
      prompt: "The transfer succeeds, but the OEM application cannot interpret the fields. Which architecture concern should you inspect first?",
      hint: "Transport worked. Look at shared meaning and schema compatibility.",
      relevantConcept: "Semantic Model",
      correctExplanation: "Correct. A successful transfer can still fail at the application layer when semantic model or schema versions do not match.",
      wrongExplanation: "Because transport already succeeded, the first suspect should be meaning/schema compatibility rather than connectivity.",
      takeaway: "Transport success does not guarantee semantic interoperability.",
      options: [
        { id: "semantic-model", label: "Semantic model and schema version", explanation: "Correct. This defines the structure and meaning the consumer expects.", concept: "Semantic Model" },
        { id: "dns", label: "Public DNS records", explanation: "DNS is unlikely to explain a payload that already arrived successfully.", concept: "Connectivity" },
        { id: "identity", label: "Create a new participant identity", explanation: "Identity was already sufficient for the governed exchange to complete.", concept: "Identity" },
      ],
      correctOptionIds: ["semantic-model"],
    },
  },
  policy: {
    simpleExplanation: "The supplier can attach conditions to a specific offer instead of treating access as a simple yes-or-no decision.",
    architectureHint: "Identity establishes the participant. Policy is evaluated against the selected offer and participant context before agreement and transfer.",
    realWorldExample: "The supplier may allow the OEM to use the PCF data for a defined business purpose while restricting redistribution.",
    keyTakeaway: "Data sovereignty includes conditions on use, not only permission to download.",
  },
  contract: {
    simpleExplanation: "Before the data moves, both connector sides turn the selected offer and accepted conditions into an agreement.",
    architectureHint: "Keep discovery, policy evaluation, negotiation and transfer as separate protocol responsibilities with explicit state transitions.",
    realWorldExample: "The OEM selects the PCF offer, accepts the required conditions, and the two connectors establish an agreement for that exchange.",
    keyTakeaway: "An agreement connects a concrete offer to accepted conditions before transfer.",
    challenge: {
      id: "lesson-contract-order",
      kind: "workflow-order",
      prompt: "Put the governed exchange milestones in the correct order.",
      hint: "You cannot negotiate an unknown offer, and you should not transfer before an agreement exists.",
      relevantConcept: "Governed exchange workflow",
      correctExplanation: "Exactly. Discovery gives you the offer, policy defines the conditions, negotiation creates the agreement, and transfer moves the protected data.",
      wrongExplanation: "The order matters because each stage creates the context required by the next one.",
      takeaway: "Discover → Policy → Negotiate → Transfer.",
      items: [
        { id: "discover", label: "Discover the offer" },
        { id: "policy", label: "Evaluate the policy conditions" },
        { id: "agreement", label: "Negotiate the agreement" },
        { id: "transfer", label: "Start the protected data transfer" },
      ],
      correctOrder: ["discover", "policy", "agreement", "transfer"],
    },
  },
  transfer: {
    simpleExplanation: "Only after trust, discovery and agreement are ready does the protected PCF payload actually move to the consumer.",
    architectureHint: "Control-plane negotiation and data-plane transfer are separate. Permission to exchange data is not the same operation as moving the bytes.",
    realWorldExample: "The supplier delivers the BAT-12345 PCF payload through the configured transfer path after the agreement exists.",
    keyTakeaway: "Agree first; transfer second.",
  },
};

export function enrichScenarioForLearning(scenario: LearningScenario): LearningScenario {
  if (scenario.id !== "battery-pcf") return scenario;
  return {
    ...scenario,
    steps: scenario.steps.map((step) => ({
      ...step,
      ...(flagshipLessonEnhancements[step.id] ?? {}),
    })),
  };
}
