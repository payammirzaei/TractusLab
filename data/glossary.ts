import { glossary as coreGlossary } from "./scenarios";

export const glossary = {
  ...coreGlossary,
  Traceability: "The ability to follow parts, batches and their relationships across the supply chain so an event can be connected to affected assets.",
  "Demand & Capacity": "A planning use case that compares what a customer needs with what a supplier can realistically provide for a part and time period.",
  "Quality Result": "A structured quality finding tied to an asset, observation and evidence so partner applications can interpret the same inspection outcome.",
  Circularity: "Using trusted product and lifecycle information to support reuse, repair, remanufacturing and recycling decisions.",
  "Product Passport": "A discoverable digital collection of product information that can connect an asset to relevant lifecycle, material and compliance data.",
} as const;
