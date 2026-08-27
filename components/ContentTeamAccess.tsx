"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getContentAccount,
  listAuditEvents,
  listContentUsers,
  updateContentUserRole,
  type AdminUser,
  type AuditEvent,
} from "@/lib/content-server";
import type { ContentRole } from "@/lib/content-workflow";
import { serverSyncEnabled } from "@/lib/server-sync";

const assignableRoles: ContentRole[] = ["learner", "author", "reviewer", "admin"];
const roleDescriptions: Record<ContentRole, string> = {
  learner: "Learning product only",
  author: "Creates drafts and revisions",
  reviewer: "Approves or requests changes",
  admin: "Publishes and manages access",
};

type PanelTab = "team" | "audit";

export function ContentTeamAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("team");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAdminData() {
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextAudit] = await Promise.all([listContentUsers(), listAuditEvents(80)]);
      setUsers(nextUsers);
      setAuditEvents(nextAudit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!serverSyncEnabled()) return;
    void getContentAccount().then((account) => {
      const admin = account?.role === "admin";
      setIsAdmin(admin);
      setCurrentUserId(account?.id ?? null);
      if (admin) void loadAdminData();
    }).catch(() => undefined);
  }, []);

  async function changeRole(userId: string, role: ContentRole) {
    setError("");
    setMessage("");
    setUpdatingId(userId);
    try {
      const updated = await updateContentUserRole(userId, role);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setMessage(`${updated.display_name || updated.email || "User"} is now ${role}.`);
      setAuditEvents(await listAuditEvents(80));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => [user.display_name, user.email, user.role].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query, users]);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] print:hidden md:bottom-5 md:right-5">
      {open && (
        <section className="mb-3 w-[min(94vw,500px)] overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#091310]/96 shadow-2xl shadow-black/50 backdrop-blur-xl" aria-label="Content administration">
          <div className="border-b border-white/8 p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">Administration</p><h2 className="mt-2 text-xl font-semibold">Team & audit trail</h2><p className="mt-1 text-xs leading-5 text-white/35">Manage responsibility and inspect sensitive workflow changes without opening the database.</p></div>
              <button onClick={() => setOpen(false)} className="button-ghost px-2.5 py-1.5 text-[11px]">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/8 bg-black/15 p-1" role="tablist" aria-label="Admin panel sections">
              <button role="tab" aria-selected={tab === "team"} onClick={() => setTab("team")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === "team" ? "bg-white/10 text-white" : "text-white/35"}`}>Team access</button>
              <button role="tab" aria-selected={tab === "audit"} onClick={() => setTab("audit")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === "audit" ? "bg-white/10 text-white" : "text-white/35"}`}>Audit trail</button>
            </div>
            {tab === "team" && <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or roles…" aria-label="Search team access" className="input-field mt-4" />}
          </div>

          <div className="max-h-[460px] overflow-y-auto p-3">
            {loading && <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="skeleton-card h-20 rounded-2xl" />)}</div>}

            {!loading && tab === "team" && filtered.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">No team member matches that search.</p>}
            {!loading && tab === "team" && filtered.map((user) => (
              <div key={user.id} className="mb-2 rounded-2xl border border-white/8 bg-black/10 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{user.display_name || user.email || "Account"}</p>{user.id === currentUserId && <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-200">YOU</span>}</div><p className="mt-1 truncate text-[11px] text-white/28">{user.email}</p></div>
                  <select value={user.role} disabled={user.id === currentUserId || updatingId === user.id} onChange={(event) => void changeRole(user.id, event.target.value as ContentRole)} className="rounded-xl border border-white/10 bg-[#0b1714] px-3 py-2 text-xs text-white/65 outline-none disabled:cursor-not-allowed disabled:opacity-45" aria-label={`Role for ${user.email ?? user.id}`}>
                    {assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <p className="mt-2 text-[10px] text-white/25">{roleDescriptions[user.role]}</p>
              </div>
            ))}

            {!loading && tab === "audit" && auditEvents.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">No audit events yet.</p>}
            {!loading && tab === "audit" && auditEvents.map((event) => {
              const actor = event.actor_user_id ? userById.get(event.actor_user_id) : null;
              return (
                <article key={event.id} className="mb-2 rounded-2xl border border-white/8 bg-black/10 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-medium text-white/75">{event.action.replaceAll(".", " · ")}</p><p className="mt-1 truncate text-[11px] text-white/28">{actor?.display_name || actor?.email || "System / unauthenticated"}{event.target_type ? ` → ${event.target_type}` : ""}{event.target_id ? ` ${event.target_id.slice(0, 12)}` : ""}</p></div>
                    <time className="text-[10px] text-white/25" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                  </div>
                  {typeof event.details.request_id === "string" && <p className="mt-2 font-mono text-[9px] text-white/18">request {event.details.request_id}</p>}
                </article>
              );
            })}

            <div aria-live="polite">{message && <p className="p-2 text-xs text-emerald-200/70">✓ {message}</p>}{error && <p className="p-2 text-xs leading-5 text-rose-200/75">{error}</p>}</div>
          </div>
        </section>
      )}

      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="ml-auto flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-[#0c1b17]/95 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300/30">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-300/10 text-xs">⌘</span>
        <span className="hidden sm:inline">Admin tools</span>
      </button>
    </div>
  );
}
