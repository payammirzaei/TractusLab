import { BOSS_SCORE_STORAGE_KEY, type BossScores } from "./boss";
import { LEARNER_NAME_STORAGE_KEY } from "./profile";
import { PROGRESS_STORAGE_KEY, type LearningProgress, type ScenarioProgress } from "./progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const SESSION_TOKEN_KEY = "tractuslab-api-session-v1";

let sessionPromise: Promise<string | null> | null = null;

export type AccountUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_guest: boolean;
  email_verified: boolean;
  role: string;
};

export type AdminManagedUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "learner" | "author" | "reviewer" | "admin";
  email_verified: boolean;
};

export type AccountSession = {
  id: string;
  current: boolean;
  created_at: string;
  expires_at: string;
};

export type EmailActionResult = {
  message: string;
  debug_token: string | null;
};

type SessionPayload = {
  access_token: string;
  user: AccountUser;
};

type RemoteProgress = {
  scenario_id: string;
  max_step: number;
  completed: boolean;
  solved_challenges: string[];
};

type RemoteState = {
  user: AccountUser;
  progress: Record<string, RemoteProgress>;
  boss_scores: BossScores;
};

export function serverSyncEnabled(): boolean {
  return Boolean(API_URL);
}

function storeSession(payload: SessionPayload): AccountUser {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_TOKEN_KEY, payload.access_token);
  }
  return payload.user;
}

async function createGuestSession(): Promise<string | null> {
  if (!API_URL || typeof window === "undefined") return null;
  const response = await fetch(`${API_URL}/v1/session/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Session creation failed: ${response.status}`);
  const body = (await response.json()) as SessionPayload;
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

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  return body.detail || fallback;
}

export async function getCurrentAccount(): Promise<AccountUser | null> {
  if (!API_URL) return null;
  const response = await apiFetch("/v1/me");
  if (!response.ok) throw new Error(await errorMessage(response, `Account load failed: ${response.status}`));
  return (await response.json()) as AccountUser;
}

export async function registerAccount(input: { email: string; password: string; displayName?: string }): Promise<AccountUser> {
  const response = await apiFetch("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: input.email, password: input.password, display_name: input.displayName || null }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, `Registration failed: ${response.status}`));
  return storeSession((await response.json()) as SessionPayload);
}

export async function loginAccount(email: string, password: string): Promise<AccountUser> {
  if (!API_URL || typeof window === "undefined") throw new Error("Account backend is not configured");
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Login failed"));
  const body = (await response.json()) as SessionPayload;
  clearLocalLearningCache();
  return storeSession(body);
}

export async function logoutAccount(): Promise<void> {
  if (!API_URL || typeof window === "undefined") return;
  const response = await apiFetch("/v1/auth/logout", { method: "POST" }, false);
  if (!response.ok && response.status !== 401) throw new Error(`Logout failed: ${response.status}`);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  clearLocalLearningCache();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AccountUser> {
  const response = await apiFetch("/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Password change failed"));
  return storeSession((await response.json()) as SessionPayload);
}

export async function requestPasswordReset(email: string): Promise<EmailActionResult> {
  if (!API_URL) throw new Error("Account backend is not configured");
  const response = await fetch(`${API_URL}/v1/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Password reset request failed"));
  return (await response.json()) as EmailActionResult;
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<AccountUser> {
  if (!API_URL) throw new Error("Account backend is not configured");
  const response = await fetch(`${API_URL}/v1/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Password reset failed"));
  const body = (await response.json()) as SessionPayload;
  clearLocalLearningCache();
  return storeSession(body);
}

export async function requestEmailVerification(): Promise<EmailActionResult> {
  const response = await apiFetch("/v1/auth/email-verification/request", { method: "POST" });
  if (!response.ok) throw new Error(await errorMessage(response, "Verification request failed"));
  return (await response.json()) as EmailActionResult;
}

export async function confirmEmailVerification(token: string): Promise<AccountUser> {
  if (!API_URL) throw new Error("Account backend is not configured");
  const response = await fetch(`${API_URL}/v1/auth/email-verification/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Email verification failed"));
  return (await response.json()) as AccountUser;
}

export async function listAccountSessions(): Promise<AccountSession[]> {
  const response = await apiFetch("/v1/auth/sessions");
  if (!response.ok) throw new Error(await errorMessage(response, "Session list failed"));
  const body = (await response.json()) as { sessions: AccountSession[] };
  return body.sessions;
}

export async function revokeAccountSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`/v1/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await errorMessage(response, "Session revoke failed"));
}

export async function revokeOtherAccountSessions(): Promise<void> {
  const response = await apiFetch("/v1/auth/sessions/revoke-others", { method: "POST" });
  if (!response.ok) throw new Error(await errorMessage(response, "Session revoke failed"));
}

export async function listAdminUsers(): Promise<AdminManagedUser[]> {
  const response = await apiFetch("/v1/admin/users");
  if (!response.ok) throw new Error(await errorMessage(response, "User list failed"));
  return (await response.json()) as AdminManagedUser[];
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  displayName?: string;
  role: AdminManagedUser["role"];
  emailVerified: boolean;
}): Promise<AdminManagedUser> {
  const response = await apiFetch("/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      display_name: input.displayName || null,
      role: input.role,
      email_verified: input.emailVerified,
    }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "User creation failed"));
  return (await response.json()) as AdminManagedUser;
}

export async function updateAdminUserRole(userId: string, role: AdminManagedUser["role"]): Promise<AdminManagedUser> {
  const response = await apiFetch(`/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Role update failed"));
  return (await response.json()) as AdminManagedUser;
}

export function clearLocalLearningCache(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  window.localStorage.removeItem(BOSS_SCORE_STORAGE_KEY);
  window.localStorage.removeItem(LEARNER_NAME_STORAGE_KEY);
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
    body: JSON.stringify({ max_step: row.maxStep, completed: row.completed, solved_challenges: row.solvedChallenges }),
  });
  if (!response.ok) throw new Error(`Progress sync failed: ${response.status}`);
}

export async function syncLearningProgress(progress: LearningProgress): Promise<void> {
  if (!API_URL) return;
  await Promise.all(Object.entries(progress).map(([scenarioId, row]) => putProgress(scenarioId, row)));
}

export async function syncBossScores(scores: BossScores): Promise<void> {
  if (!API_URL) return;
  await Promise.all(Object.entries(scores).map(async ([scenarioId, score]) => {
    const response = await apiFetch(`/v1/boss-scores/${encodeURIComponent(scenarioId)}`, { method: "PUT", body: JSON.stringify({ score }) });
    if (!response.ok) throw new Error(`Boss score sync failed: ${response.status}`);
  }));
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
  const response = await apiFetch("/v1/me", { method: "PATCH", body: JSON.stringify({ display_name: displayName || null }) });
  if (!response.ok) throw new Error(`Profile sync failed: ${response.status}`);
}
