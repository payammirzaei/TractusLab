"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { LearnerNav } from "@/components/LearnerNav";
import { passwordSignals, passwordStrength } from "@/lib/account-ux";
import { confirmPasswordReset } from "@/lib/server-sync";

export function ResetPasswordPanel({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const signals = useMemo(() => passwordSignals(password), [password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Reset token is missing or the link is incomplete.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <LearnerNav eyebrow="Account recovery" />
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16">
        <section className="surface-hero p-6 md:p-9">
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-300/10 text-2xl text-emerald-200">✓</div>
              <p className="eyebrow mt-6">Password updated</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Fresh password. Fresh session.</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/42">All older sessions were revoked as part of the reset, so the new session is the only trusted starting point.</p>
              <Link href="/profile" className="button-primary mt-7">Open profile →</Link>
            </div>
          ) : (
            <>
              <p className="eyebrow">Password reset</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Choose a new password.</h1>
              <p className="mt-3 text-sm leading-6 text-white/42">This link is single-use and expires. A successful reset revokes older account sessions.</p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                <label className="block text-xs font-medium text-white/48">New password<div className="relative mt-2"><input type={showPassword ? "text" : "password"} required minLength={10} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input-field pr-20" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-white/35 hover:text-white/70">{showPassword ? "Hide" : "Show"}</button></div></label>
                <label className="block text-xs font-medium text-white/48">Confirm new password<input type={showPassword ? "text" : "password"} required minLength={10} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="input-field mt-2" /></label>

                {password && <div className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex items-center justify-between text-xs"><span className="text-white/32">Strength</span><span className="font-semibold text-white/65">{strength.label}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${strength.score}%` }} /></div><div className="mt-3 grid gap-1 sm:grid-cols-2">{signals.map((signal) => <span key={signal.id} className={`text-[10px] ${signal.met ? "text-emerald-200/70" : "text-white/25"}`}>{signal.met ? "✓" : "○"} {signal.label}</span>)}</div></div>}

                <div aria-live="polite">{error && <p className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-3 text-sm text-rose-100/80">{error}</p>}</div>
                <button disabled={busy || !token} className="button-primary w-full py-3 text-sm disabled:opacity-45">{busy ? "Resetting…" : "Reset password"}</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
