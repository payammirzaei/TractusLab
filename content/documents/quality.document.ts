import { createScenarioDocument } from "../../lib/content";
import { qualityScenario } from "../quality";

export const qualityDocument = createScenarioDocument(qualityScenario, {
  version: "1.0.0",
  status: "published",
  tags: ["quality", "collaboration", "semantics"],
  summary: "Investigate a quality issue through governed cross-company data exchange and shared meaning.",
});
