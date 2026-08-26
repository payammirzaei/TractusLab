import { createScenarioDocument } from "../../lib/content";
import { traceabilityScenario } from "../traceability";

export const traceabilityDocument = createScenarioDocument(traceabilityScenario, {
  version: "1.0.0",
  status: "published",
  tags: ["traceability", "quality", "digital-twin"],
  summary: "Follow part relationships across company boundaries and diagnose broken traceability flows.",
});
