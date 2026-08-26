import { createScenarioDocument } from "../../lib/content";
import { learningScenarios } from "../scenarios";

const scenario = learningScenarios.find((item) => item.id === "battery-pcf");
if (!scenario) throw new Error("Packaged battery-pcf scenario is missing");

export const batteryPcfDocument = createScenarioDocument(scenario, {
  version: "1.0.0",
  status: "published",
  tags: ["foundation", "pcf", "sustainability", "edc"],
  summary: "Learn one governed Product Carbon Footprint exchange from business need to controlled transfer.",
});
