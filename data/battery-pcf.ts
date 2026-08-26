export type LearningStep = {
  id: string;
  eyebrow: string;
  question: string;
  explanation: string;
  technicalName: string;
  technicalHint: string;
  from: "supplier" | "oem" | "both";
};

export const batteryPcfSteps: LearningStep[] = [
  {
    id: "identity",
    eyebrow: "Step 1",
    question: "Who is asking for the battery data?",
    explanation: "Before Supplier A shares anything, it needs to know who the other company is and whether it can be trusted.",
    technicalName: "Identity",
    technicalHint: "Participants prove who they are before controlled data exchange begins.",
    from: "oem",
  },
  {
    id: "catalog",
    eyebrow: "Step 2",
    question: "What data can Supplier A offer?",
    explanation: "The manufacturer first discovers which battery data is available. It does not get the data yet — only an offer describing it.",
    technicalName: "Catalog",
    technicalHint: "The consumer asks the provider connector which assets are available to this participant.",
    from: "supplier",
  },
  {
    id: "policy",
    eyebrow: "Step 3",
    question: "May the manufacturer use this CO₂ data?",
    explanation: "Supplier A can attach conditions to the data, for example allowing it only for product-carbon-footprint reporting.",
    technicalName: "Policy",
    technicalHint: "Usage conditions are evaluated before a contract can be agreed.",
    from: "supplier",
  },
  {
    id: "contract",
    eyebrow: "Step 4",
    question: "Do both companies agree to the conditions?",
    explanation: "The two sides agree on what can be shared and under which rules before the actual data moves.",
    technicalName: "Contract Negotiation",
    technicalHint: "The consumer and provider negotiate an agreement based on the offered policy.",
    from: "both",
  },
  {
    id: "transfer",
    eyebrow: "Step 5",
    question: "Now can the CO₂ data move?",
    explanation: "Yes. Once identity, offer and conditions are settled, the agreed battery carbon-footprint data can be transferred.",
    technicalName: "Data Transfer",
    technicalHint: "The agreed data is transferred through the dataspace without requiring a shared central database.",
    from: "supplier",
  },
];
