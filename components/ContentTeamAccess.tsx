"use client";

import { useEffect, useState } from "react";
import {
  getContentAccount,
  listContentUsers,
  updateContentUserRole,
  type AdminUser,
} from "@/lib/content-server";
import type { ContentRole } from "@/lib/content-workflow";
import { serverSyncEnabled } from "@/lib/server-sync";

const assignableRoles: ContentRole[] = ["learner", "author", "reviewer", "admin"];

export function ContentTeamAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await listContentUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team access");
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
      if (admin) void loadUsers();
    }).catch(() => undefined);
  }, []);

  async function changeRole(userId: string, role: ContentRole) {
    setError("");
    try {
      const updated = await updateContentUserRole(userId, role);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div className="mb-3 w-[min(92vw,430px)] overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#091310]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Team access</p>
              <h2 className="mt-2 text-xl font-semibold">Content roles</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">Authors write. Reviewers approve. Admins publish and manage access.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70">Close</button>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-3">
            {loading && <p className="p-4 text-sm text-white/35">Loading team…</p>}
            {!loading && users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.display_name || user.email || "Account"}</p>
                  <p className="mt-1 truncate text-[11px] text-white/28">{user.email}</p>
                </div>
                <select
                  value={user.role}
                  disabled={user.id === currentUserId}
                  onChange={(event) => void changeRole(user.id, event.target.value as ContentRole)}
                  className="rounded-xl border border-white/10 bg-[#0b1714] px-3 py-2 text-xs text-white/65 outline-none disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={`Role for ${user.email ?? user.id}`}
                >
                  {assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            ))}
            {error && <p className="p-3 text-xs leading-5 text-rose-200/75">{error}</p>}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex items-center gap-2 rounded-full border border-emerald-300/20 bg-[#0c1b17]/95 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300/30"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/10 text-xs">⌘</span>
        Team access
      </button>
    </div>
  );
}
