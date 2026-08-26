import type { BossScores } from "./boss";
import type { LearningProgress, ScenarioProgress } from "./progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const SESSION_TOKEN_KEY = "tractuslab-api-session-v1";

let sessionPromise: Promise<string | null> | null = null;

type RemoteProgress = {
  scenario_id: string;
  max_step: number;
  completed: boolean;
  solved_challenges: string[];
};

type RemoteState = {
  user: { id: string; display_name: string | null };
  progress: Record<string, RemoteProgress>;
  boss_scores: BossScores;
};

export function serverSyncEnabled(): boolean {
  return Boolean(API_URL);
}

async function createGuestSession(): Promise<string | null> {
  if (!API_URL || typeof window === "undefined") return null;
  const response = await fetch(`${API_URL}/v1/session/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Session creation failed: ${response.status}`);
  const body = (await response.json()) as { access_token: string };
  window.localStorage.setItem(SESSION_TOKEN_KEY, body.access_token);
  return body.access_token;
}

async function ensureSession(): Promise<string | null> {
  if (!API_URL || typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(SESSION_TOKEN_KEY);
  if (stored) return stored;
  if (!sessionPromise) {
    sessionPromise = createGuestSession().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await ensureSession();
  if (!token) throw new Error("Server sync is disabled");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return apiFetch(path, init, false);
  }
  return response;
}

export async function loadRemoteState(): Promise<{ progress: LearningProgress; bossScores: BossScores; displayName: string | null } | null> {
  if (!API_URL) return null;
  const response = await apiFetch("/v1/state");
  if (!response.ok) throw new Error(`State load failed: ${response.status}`);
  const body = (await response.json()) as RemoteState;
  const progress: LearningProgress = {};
  for (const [scenarioId, row] of Object.entries(body.progress)) {
    progress[scenarioId] = {
      maxStep: row.max_step,
      completed: row.completed,
      solvedChallenges: row.solved_challenges,
    };
  }
  return { progress, bossScores: body.boss_scores, displayName: body.user.display_name };
}

export function mergeProgress(local: LearningProgress, remote: LearningProgress): LearningProgress {
  const merged: LearningProgress = { ...local };
  for (const [scenarioId, row] of Object.entries(remote)) {
    const current = merged[scenarioId];
    if (!current) {
      merged[scenarioId] = row;
      continue;
    }
    merged[scenarioId] = {
      maxStep: Math.max(current.maxStep, row.maxStep),
      completed: current.completed || row.completed,
      solvedChallenges: [...new Set([...current.solvedChallenges, ...row.solvedChallenges])].sort(),
    };
  }
  return merged;
}

export function mergeBossScores(local: BossScores, remote: BossScores): BossScores {
  const merged = { ...local };
  for (const [scenarioId, score] of Object.entries(remote)) {
    merged[scenarioId] = Math.max(merged[scenarioId] ?? 0, score);
  }
  return merged;
}

async function putProgress(scenarioId: string, row: ScenarioProgress): Promise<void> {
  const response = await apiFetch(`/v1/progress/${encodeURIComponent(scenarioId)}`, {
    method: "PUT",
    body: JSON.stringify({
      max_step: row.maxStep,
      completed: row.completed,
      solved_challenges: row.solvedChallenges,
    }),
  });
  if (!response.ok) throw new Error(`Progress sync failed: ${response.status}`);
}

export async function syncLearningProgress(progress: LearningProgress): Promise<void> {
  if (!API_URL) return;
  await Promise.all(Object.entries(progress).map(([scenarioId, row]) => putProgress(scenarioId, row)));
}

export async function syncBossScores(scores: BossScores): Promise<void> {
  if (!API_URL) return;
  await Promise.all(
    Object.entries(scores).map(async ([scenarioId, score]) => {
      const response = await apiFetch(`/v1/boss-scores/${encodeURIComponent(scenarioId)}`, {
        method: "PUT",
        body: JSON.stringify({ score }),
      });
      if (!response.ok) throw new Error(`Boss score sync failed: ${response.status}`);
    }),
  );
}

export async function clearRemoteProgress(): Promise<void> {
  if (!API_URL) return;
  const response = await apiFetch("/v1/progress", { method: "DELETE" });
  if (!response.ok) throw new Error(`Progress reset failed: ${response.status}`);
}

export async function clearRemoteBossScores(): Promise<void> {
  if (!API_URL) return;
  const response = await apiFetch("/v1/boss-scores", { method: "DELETE" });
  if (!response.ok) throw new Error(`Boss score reset failed: ${response.status}`);
}

export async function syncDisplayName(displayName: string): Promise<void> {
  if (!API_URL) return;
  const response = await apiFetch("/v1/me", {
    method: "PATCH",
    body: JSON.stringify({ display_name: displayName || null }),
  });
  if (!response.ok) throw new Error(`Profile sync failed: ${response.status}`);
}
