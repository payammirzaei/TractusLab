"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  changePassword,
  listAccountSessions,
  requestEmailVerification,
  revokeAccountSession,
  revokeOtherAccountSessions,
  type AccountSession,
  type AccountUser,
} from "@/lib/server-sync";

export function AccountSecurityPanel({ user, onUserChange }: { user: AccountUser; onUserChange: (user: AccountUser) => void }) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugVerificationToken, setDebugVerificationToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshSessions() {
    try {
      setSessions(await listAccountSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sessions");
    }
  }

  useEffect(() => {
    void refreshSessions();
  }, []);

  async function verifyEmail() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await requestEmailVerification();
      setMessage(result.message);
      setDebugVerificationToken(result.debug_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification request failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const nextUser = await changePassword(currentPassword, newPassword);
      onUserChange(nextUser);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed. All other sessions were signed out.");
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(sessionId: string) {
    setBusy(true);
    setError("");
    try {
      await revokeAccountSession(sessionId);
      setMessage("Session revoked.");
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    setBusy(true);
    setError("");
    try {
      await revokeOtherAccountSessions();
      setMessage("Other sessions signed out.");
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Email security</p>
            <h2 className="mt-2 text-xl font-semibold">{user.email_verified ? "Email verified" : "Verify your email"}</h2>
            <p className="mt-2 text-sm text-white/45">{user.email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${user.email_verified ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>
            {user.email_verified ? "Verified" : "Pending"}
          </span>
        </div>
        {!user.email_verified && (
          <button disabled={busy} onClick={verifyEmail} className="mt-5 rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-50">
            Send verification link
          </button>
        )}
        {debugVerificationToken && (
          <p className="mt-4 text-xs leading-5 text-amber-100/70">
            Dev mode: <Link className="underline" href={`/account/verify?token=${encodeURIComponent(debugVerificationToken)}`}>open verification link</Link>
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Password</p>
        <h2 className="mt-2 text-xl font-semibold">Change password</h2>
        <form onSubmit={submitPassword} className="mt-5 space-y-3">
          <input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
          <input type="password" required minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
          <input type="password" required minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
          <button disabled={busy} className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-[#07110f] disabled:opacity-50">Change password</button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Sessions</p>
            <h2 className="mt-2 text-xl font-semibold">Active sign-ins</h2>
            <p className="mt-2 text-sm text-white/40">Revoke sessions you no longer recognize or sign out everywhere else.</p>
          </div>
          <button disabled={busy || sessions.length <= 1} onClick={revokeOthers} className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-40">Sign out other sessions</button>
        </div>

        <div className="mt-5 space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/15 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{session.current ? "This session" : "Other session"}</span>
                  {session.current && <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] text-emerald-200">CURRENT</span>}
                </div>
                <p className="mt-1 text-xs text-white/35">Started {new Date(session.created_at).toLocaleString()} · expires {new Date(session.expires_at).toLocaleDateString()}</p>
              </div>
              {!session.current && (
                <button disabled={busy} onClick={() => revoke(session.id)} className="rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-200/80 disabled:opacity-40">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {(message || error) && (
        <div className="lg:col-span-2">
          {message && <p className="text-sm text-emerald-200">{message}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
