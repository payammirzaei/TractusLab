"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { confirmPasswordReset } from "@/lib/server-sync";

export function ResetPasswordPanel({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Reset token is missing.");
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
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-xl">
        <Link href="/account" className="font-semibold">← Account</Link>
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          {done ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Password updated</p>
              <h1 className="mt-3 text-3xl font-semibold">You are signed in with a fresh session.</h1>
              <p className="mt-3 text-sm leading-6 text-white/45">All older sessions were revoked as part of the reset.</p>
              <Link href="/profile" className="mt-7 inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">Open profile →</Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Password reset</p>
              <h1 className="mt-3 text-3xl font-semibold">Choose a new password.</h1>
              <form onSubmit={submit} className="mt-7 space-y-4">
                <input type="password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                <input type="password" required minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm new password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                {error && <p className="text-sm text-rose-300">{error}</p>}
                <button disabled={busy || !token} className="w-full rounded-full bg-emerald-300 px-5 py-3 font-semibold text-[#07110f] disabled:opacity-50">{busy ? "Resetting…" : "Reset password"}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
