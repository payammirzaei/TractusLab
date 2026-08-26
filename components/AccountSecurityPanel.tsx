"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { passwordSignals, passwordStrength } from "@/lib/account-ux";
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
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugVerificationToken, setDebugVerificationToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const signals = useMemo(() => passwordSignals(newPassword), [newPassword]);

  async function refreshSessions() {
    setSessionsLoading(true);
    try {
      setSessions(await listAccountSessions());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sessions");
    } finally {
      setSessionsLoading(false);
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
    if (confirmRevokeId !== sessionId) {
      setConfirmRevokeId(sessionId);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await revokeAccountSession(sessionId);
      setMessage("Session revoked.");
      setConfirmRevokeId(null);
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    if (!confirmOthers) {
      setConfirmOthers(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await revokeOtherAccountSessions();
      setMessage("Other sessions signed out.");
      setConfirmOthers(false);
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section className="surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Email security</p>
            <h2 className="mt-2 text-xl font-semibold">{user.email_verified ? "Email verified" : "Verify your email"}</h2>
            <p className="mt-2 text-sm text-white/40">{user.email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.email_verified ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>
            {user.email_verified ? "Verified" : "Pending"}
          </span>
        </div>
        <p className="mt-5 text-sm leading-6 text-white/36">Verification strengthens account recovery and confirms where security messages should be delivered.</p>
        {!user.email_verified && <button disabled={busy} onClick={verifyEmail} className="button-secondary mt-5 disabled:opacity-40">Send verification link</button>}
        {debugVerificationToken && <p className="mt-4 text-xs leading-5 text-amber-100/70">Dev mode: <Link className="underline underline-offset-4" href={`/account/verify?token=${encodeURIComponent(debugVerificationToken)}`}>open verification link</Link></p>}
      </section>

      <section className="surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="eyebrow">Password</p><h2 className="mt-2 text-xl font-semibold">Change your password</h2></div>
          <button type="button" onClick={() => setShowPasswords((value) => !value)} className="button-ghost text-[11px]">{showPasswords ? "Hide" : "Show"}</button>
        </div>
        <form onSubmit={submitPassword} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-white/45">Current password<input type={showPasswords ? "text" : "password"} required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="input-field mt-2" /></label>
          <label className="block text-xs font-medium text-white/45">New password<input type={showPasswords ? "text" : "password"} required minLength={10} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input-field mt-2" /></label>
          <label className="block text-xs font-medium text-white/45">Confirm new password<input type={showPasswords ? "text" : "password"} required minLength={10} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input-field mt-2" /></label>

          {newPassword && (
            <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
              <div className="flex items-center justify-between text-xs"><span className="text-white/32">Strength</span><span className="font-semibold text-white/65">{strength.label}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${strength.score}%` }} /></div>
              <div className="mt-3 grid gap-1 sm:grid-cols-2">{signals.map((signal) => <span key={signal.id} className={`text-[10px] ${signal.met ? "text-emerald-200/70" : "text-white/25"}`}>{signal.met ? "✓" : "○"} {signal.label}</span>)}</div>
            </div>
          )}

          <button disabled={busy} className="button-primary disabled:opacity-40">Change password</button>
        </form>
      </section>

      <section className="surface-panel p-6 lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Active sessions</p>
            <h2 className="mt-2 text-xl font-semibold">Devices with access to your account</h2>
            <p className="mt-2 text-sm text-white/38">Revoke a session you do not recognize. Destructive actions require a second click.</p>
          </div>
          <button disabled={busy || sessions.length <= 1} onClick={revokeOthers} onBlur={() => setConfirmOthers(false)} className={confirmOthers ? "button-danger" : "button-ghost"}>
            {confirmOthers ? "Confirm sign out others" : "Sign out other sessions"}
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {sessionsLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">{[0, 1].map((item) => <div key={item} className="skeleton-card h-20 rounded-2xl" />)}</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">No active sessions were returned. Refresh the page or check the API connection.</div>
          ) : sessions.map((session) => (
            <div key={session.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${session.current ? "border-emerald-300/15 bg-emerald-300/[0.035]" : "border-white/8 bg-black/10"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-9 w-9 place-items-center rounded-xl ${session.current ? "bg-emerald-300/10 text-emerald-200" : "bg-white/[0.04] text-white/35"}`}>{session.current ? "●" : "○"}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{session.current ? "This session" : "Other session"}</span>{session.current && <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] text-emerald-200">CURRENT</span>}</div>
                  <p className="mt-1 text-xs text-white/32">Started {new Date(session.created_at).toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-white/24">Expires {new Date(session.expires_at).toLocaleDateString()}</p>
                </div>
              </div>
              {!session.current && <button disabled={busy} onClick={() => void revoke(session.id)} onBlur={() => setConfirmRevokeId((current) => current === session.id ? null : current)} className={confirmRevokeId === session.id ? "button-danger" : "button-ghost"}>{confirmRevokeId === session.id ? "Confirm revoke" : "Revoke"}</button>}
            </div>
          ))}
        </div>
      </section>

      {(message || error) && (
        <div className="lg:col-span-2" aria-live="polite">
          {message && <p className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-sm text-emerald-100/75">✓ {message}</p>}
          {error && <p className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-3 text-sm text-rose-100/80">{error}</p>}
        </div>
      )}
    </div>
  );
}
