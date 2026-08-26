import { createScenarioDocument } from "../../lib/content";
import { learningScenarios } from "../scenarios";

const scenario = learningScenarios.find((item) => item.id === "digital-twin");
if (!scenario) throw new Error("Packaged digital-twin scenario is missing");

export const digitalTwinDocument = createScenarioDocument(scenario, {
  version: "1.0.0",
  status: "published",
  tags: ["digital-twin", "dtr", "semantics"],
  summary: "Discover a component digital twin, resolve a submodel, and separate discovery from protected access.",
});
