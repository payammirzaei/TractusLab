import { scenarioDocuments } from "../data/content-registry.ts";
import { validateScenarioCatalog } from "../lib/content.ts";

const result = validateScenarioCatalog(scenarioDocuments);

if (!result.valid) {
  console.error("TractusLab content validation failed:\n");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${scenarioDocuments.length} scenario content documents.`);
