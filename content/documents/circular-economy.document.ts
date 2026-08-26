import { createScenarioDocument } from "../../lib/content";
import { circularEconomyScenario } from "../circular-economy";

export const circularEconomyDocument = createScenarioDocument(circularEconomyScenario, {
  version: "1.0.0",
  status: "published",
  tags: ["circularity", "product-passport", "digital-twin"],
  summary: "Assemble trusted product information for circular-economy and product-passport decisions.",
});
