"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { publishedScenarioDocuments } from "@/data/content-registry";
import { learningScenarios, replaceRuntimeScenarioDocuments } from "@/data/catalog";
import { fetchPublishedContent, publicContentEnabled } from "@/lib/public-content";
import { mergePublishedContent } from "@/lib/runtime-content";

type RuntimeStatus = "packaged" | "syncing" | "server" | "fallback";

export function RuntimeContentGate({ children, requiredScenarioId }: { children: ReactNode; requiredScenarioId?: string }) {
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [status, setStatus] = useState<RuntimeStatus>(publicContentEnabled() ? "syncing" : "packaged");
  const [overlayCount, setOverlayCount] = useState(0);

  useEffect(() => {
    if (!publicContentEnabled()) return;
    let active = true;

    void fetchPublishedContent()
      .then((remote) => {
        if (!active) return;
        const merged = mergePublishedContent(publishedScenarioDocuments, remote);
        replaceRuntimeScenarioDocuments(merged.documents);
        setOverlayCount(merged.overlayCount);
        setStatus(merged.overlayCount > 0 ? "server" : "packaged");
        setCatalogVersion((value) => value + 1);
        if (merged.rejectedCount > 0) {
          console.warn("TractusLab rejected invalid published content", merged.rejected);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        replaceRuntimeScenarioDocuments(publishedScenarioDocuments);
        setStatus("fallback");
        setCatalogVersion((value) => value + 1);
        console.warn("TractusLab is using packaged content fallback", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const requiredScenarioExists = !requiredScenarioId || learningScenarios.some((scenario) => scenario.id === requiredScenarioId);
  const waitingForRequiredScenario = Boolean(requiredScenarioId && !requiredScenarioExists && status === "syncing");
  const missingRequiredScenario = Boolean(requiredScenarioId && !requiredScenarioExists && status !== "syncing");

  return (
    <div key={`runtime-catalog-${catalogVersion}`}>
      {waitingForRequiredScenario ? (
        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-16 md:px-8">
          <section className="surface-hero w-full p-7 md:p-10" aria-live="polite">
            <p className="eyebrow">Loading scenario</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-5xl">Checking the published learning catalog…</h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/46">This scenario is not in the packaged catalog, so TractusLab is checking whether a published server version exists.</p>
          </section>
        </main>
      ) : missingRequiredScenario ? (
        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-16 md:px-8">
          <section className="surface-hero w-full p-7 md:p-10">
            <p className="eyebrow">Scenario not found</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-5xl">That learning mission is not available.</h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/46">The scenario may have been renamed, unpublished, or the link may be outdated. No other scenario was substituted in its place.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/scenarios" className="button-primary">Open Scenario Hub →</Link>
              <Link href="/path" className="button-ghost">Return to Mission Path</Link>
            </div>
          </section>
        </main>
      ) : children}

      {publicContentEnabled() && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-50 hidden rounded-full border border-white/10 bg-[#07110f]/90 px-3 py-1.5 text-[10px] font-medium text-white/45 shadow-xl backdrop-blur md:block">
          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status === "server" ? "bg-emerald-300" : status === "syncing" ? "animate-pulse bg-cyan-300" : status === "fallback" ? "bg-amber-300" : "bg-white/25"}`} />
          {status === "server" ? `${overlayCount} published server version${overlayCount === 1 ? "" : "s"} active` : status === "syncing" ? "Checking published content…" : status === "fallback" ? "Packaged content fallback" : "Packaged content"}
        </div>
      )}
    </div>
  );
}
