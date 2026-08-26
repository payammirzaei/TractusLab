import type { PublishedContentEnvelope } from "./runtime-content";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export function publicContentEnabled(): boolean {
  return Boolean(API_URL);
}

export async function fetchPublishedContent(): Promise<PublishedContentEnvelope[]> {
  if (!API_URL) return [];
  const response = await fetch(`${API_URL}/v1/content/published`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Published content load failed: ${response.status}`);
  return (await response.json()) as PublishedContentEnvelope[];
}
