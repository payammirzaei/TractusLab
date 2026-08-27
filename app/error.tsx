"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("TractusLab route error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="surface-hero w-full max-w-2xl p-7 text-center md:p-10" role="alert">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] text-xl text-amber-100">!</div>
        <p className="eyebrow mt-6">Recovery mode</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">This screen hit an unexpected problem.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/42">Your local learning evidence is kept separately. Retry this screen first; if the API is offline, the learner experience can still fall back to packaged content.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="button-primary">Try again</button>
          <Link href="/" className="button-ghost">Back home</Link>
        </div>
        {error.digest && <p className="mt-6 font-mono text-[10px] text-white/20">Reference {error.digest}</p>}
      </section>
    </main>
  );
}
