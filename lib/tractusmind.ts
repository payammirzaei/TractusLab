export type TractusMindContext = {
  concept: string;
  question?: string;
  explanation?: string;
  scenarioId?: string;
  stepId?: string;
  sourceHint?: string;
};

export function tractusMindContextText(context: TractusMindContext): string {
  return [
    `Concept: ${context.concept}`,
    context.question ? `Question: ${context.question}` : "",
    context.explanation ? `Current explanation: ${context.explanation}` : "",
    context.scenarioId ? `Scenario: ${context.scenarioId}` : "",
    context.stepId ? `Lesson step: ${context.stepId}` : "",
    context.sourceHint ? `Source context: ${context.sourceHint}` : "",
    "Request: Explain this concept more deeply and ground the answer in relevant Tractus-X / dataspace sources.",
  ].filter(Boolean).join("\n");
}

export function buildTractusMindUrl(baseUrl: string, context: TractusMindContext): string {
  const url = new URL(baseUrl);
  url.searchParams.set("q", tractusMindContextText(context));
  url.searchParams.set("source", "tractuslab");
  if (context.scenarioId) url.searchParams.set("scenario", context.scenarioId);
  if (context.stepId) url.searchParams.set("step", context.stepId);
  return url.toString();
}
