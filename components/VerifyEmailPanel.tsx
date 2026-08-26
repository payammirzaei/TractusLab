"use client";

import Link from "next/link";
import { useState } from "react";
import { confirmEmailVerification } from "@/lib/server-sync";

export function VerifyEmailPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (!token) {
      setError("Verification token is missing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmEmailVerification(token);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email verification failed");
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Verified</p>
              <h1 className="mt-3 text-3xl font-semibold">Your email is verified.</h1>
              <p className="mt-3 text-sm leading-6 text-white/45">This verification token cannot be used again.</p>
              <Link href="/account" className="mt-7 inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">Back to account →</Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Email verification</p>
              <h1 className="mt-3 text-3xl font-semibold">Confirm this email address.</h1>
              <p className="mt-3 text-sm leading-6 text-white/45">Verification uses a single-use expiring token. Opening this page does not consume it; confirmation happens only when you click below.</p>
              {error && <p className="mt-5 text-sm text-rose-300">{error}</p>}
              <button disabled={busy || !token} onClick={verify} className="mt-7 rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f] disabled:opacity-50">{busy ? "Verifying…" : "Verify email"}</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
