import type { ScenarioContentDocument } from "./content";
import { resilientFetch } from "./http-resilience";
import { getCurrentAccount, serverSyncEnabled, type AccountUser } from "./server-sync";
import type { ContentRole, ContentStatus } from "./content-workflow";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const SESSION_TOKEN_KEY = "tractuslab-api-session-v1";

export type ContentAccount = AccountUser & { role: ContentRole };
export type RevisionState = "draft" | "in_review" | "approved" | "changes_requested" | "published";

export type ServerContentSummary = {
  id: string;
  scenario_id: string;
  title: string;
  status: ContentStatus;
  latest_revision: number;
  published_revision: number | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type ServerContentRevision = {
  id: string;
  revision_number: number;
  state: RevisionState;
  document: ScenarioContentDocument;
  created_by_user_id: string;
  review_note: string | null;
  reviewed_by_user_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type ServerContentDetail = {
  item: ServerContentSummary;
  revisions: ServerContentRevision[];
};

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: ContentRole;
  email_verified: boolean;
};

export type AuditEvent = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

async function contentFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!serverSyncEnabled() || typeof window === "undefined") throw new Error("Content backend is not configured");
  await getCurrentAccount();
  const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error("Sign in before using server content workflow");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const request = `${API_URL}${path}`;
  const method = (init.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD"
    ? resilientFetch(request, { ...init, headers, cache: "no-store" })
    : fetch(request, { ...init, headers });
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string | { message?: string; errors?: string[] } };
  if (typeof body.detail === "string") return body.detail;
  if (body.detail?.errors?.length) return body.detail.errors.join(" · ");
  if (body.detail?.message) return body.detail.message;
  return fallback;
}

export async function getContentAccount(): Promise<ContentAccount | null> {
  const user = await getCurrentAccount();
  if (!user) return null;
  const withRole = user as AccountUser & { role?: ContentRole };
  return { ...user, role: withRole.role ?? "learner" };
}

export async function listServerContent(): Promise<ServerContentSummary[]> {
  const response = await contentFetch("/v1/content");
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load content workflow"));
  return (await response.json()) as ServerContentSummary[];
}

export async function getServerContent(contentId: string): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}`);
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load content detail"));
  return (await response.json()) as ServerContentDetail;
}

export async function createServerContent(document: ScenarioContentDocument): Promise<ServerContentDetail> {
  const response = await contentFetch("/v1/content", { method: "POST", body: JSON.stringify({ document }) });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not create server draft"));
  return (await response.json()) as ServerContentDetail;
}

export async function createServerRevision(contentId: string, document: ScenarioContentDocument): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}/revisions`, {
    method: "POST",
    body: JSON.stringify({ document }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not create revision"));
  return (await response.json()) as ServerContentDetail;
}

export async function submitServerContent(contentId: string): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}/submit`, { method: "POST" });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not submit revision"));
  return (await response.json()) as ServerContentDetail;
}

export async function reviewServerContent(contentId: string, action: "approve" | "request_changes", note: string): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}/review`, {
    method: "POST",
    body: JSON.stringify({ action, note: note.trim() || null }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not review revision"));
  return (await response.json()) as ServerContentDetail;
}

export async function publishServerContent(contentId: string): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}/publish`, { method: "POST" });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not publish revision"));
  return (await response.json()) as ServerContentDetail;
}

export async function archiveServerContent(contentId: string): Promise<ServerContentDetail> {
  const response = await contentFetch(`/v1/content/${encodeURIComponent(contentId)}/archive`, { method: "POST" });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not archive content"));
  return (await response.json()) as ServerContentDetail;
}

export async function listContentUsers(): Promise<AdminUser[]> {
  const response = await contentFetch("/v1/admin/users");
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load content team"));
  return (await response.json()) as AdminUser[];
}

export async function updateContentUserRole(userId: string, role: ContentRole): Promise<AdminUser> {
  const response = await contentFetch(`/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not update content role"));
  return (await response.json()) as AdminUser;
}

export async function listAuditEvents(limit = 100): Promise<AuditEvent[]> {
  const response = await contentFetch(`/v1/admin/audit-events?limit=${Math.max(1, Math.min(250, limit))}`);
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load audit trail"));
  return (await response.json()) as AuditEvent[];
}
