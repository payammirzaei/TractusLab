import { glossary as coreGlossary } from "./scenarios";

export const glossary = {
  ...coreGlossary,
  Traceability: "The ability to follow parts, batches and their relationships across the supply chain so an event can be connected to affected assets.",
  "Demand & Capacity": "A planning use case that compares what a customer needs with what a supplier can realistically provide for a part and time period.",
} as const;
