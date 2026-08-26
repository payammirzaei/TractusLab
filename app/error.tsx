"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("TractusLab route error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <section className="surface-hero w-full max-w-2xl p-6 md:p-9" role="alert" aria-live="assertive">
        <p className="eyebrow">Something interrupted the lab</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">This view could not finish loading.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/48">
          Your local learning progress is kept separately. Retry this view first; if the problem continues, return to the scenario hub.
        </p>
        {error.digest ? <p className="mt-3 font-mono text-[10px] text-white/24">Reference: {error.digest}</p> : null}
        <div className="mt-7 flex flex-wrap gap-2.5">
          <button type="button" className="button-primary" onClick={reset}>Retry view</button>
          <Link className="button-secondary" href="/scenarios">Scenario hub</Link>
          <Link className="button-ghost" href="/">Home</Link>
        </div>
      </section>
    </main>
  );
}
