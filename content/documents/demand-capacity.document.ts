import { createScenarioDocument } from "../../lib/content";
import { demandCapacityScenario } from "../demand-capacity";

export const demandCapacityDocument = createScenarioDocument(demandCapacityScenario, {
  version: "1.0.0",
  status: "published",
  tags: ["planning", "demand", "capacity", "edc"],
  summary: "Coordinate planning data without exposing internal ERP systems or surrendering data control.",
});
