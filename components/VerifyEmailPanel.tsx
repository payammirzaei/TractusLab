"use client";

import Link from "next/link";
import { useState } from "react";
import { LearnerNav } from "@/components/LearnerNav";
import { confirmEmailVerification } from "@/lib/server-sync";

export function VerifyEmailPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (!token) {
      setError("Verification token is missing or the link is incomplete.");
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
    <main className="min-h-screen pb-16">
      <LearnerNav eyebrow="Email security" />
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16">
        <section className="surface-hero p-6 text-center md:p-9">
          {done ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-300/10 text-2xl text-emerald-200">✓</div>
              <p className="eyebrow mt-6">Verified</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Your email is verified.</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/42">The verification token is now consumed and cannot be used again.</p>
              <Link href="/account" className="button-primary mt-7">Back to account →</Link>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] text-xl text-cyan-100">@</div>
              <p className="eyebrow mt-6">Email verification</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Confirm this email address.</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/42">Opening this page does not consume the single-use token. Verification happens only after the explicit confirmation below.</p>
              <div aria-live="polite">{error && <p className="mx-auto mt-5 max-w-lg rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-3 text-sm text-rose-100/80">{error}</p>}</div>
              <button disabled={busy || !token} onClick={verify} className="button-primary mt-7 px-6 py-3 text-sm disabled:opacity-45">{busy ? "Verifying…" : "Verify email"}</button>
              {!token && <p className="mt-4 text-xs text-white/30">Request a fresh verification link from Account Security.</p>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
