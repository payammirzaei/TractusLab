"use client";

import { useEffect, useState, type ReactNode } from "react";
import { publishedScenarioDocuments } from "@/data/content-registry";
import { replaceRuntimeScenarioDocuments } from "@/data/catalog";
import { fetchPublishedContent, publicContentEnabled } from "@/lib/public-content";
import { mergePublishedContent } from "@/lib/runtime-content";

type RuntimeStatus = "packaged" | "syncing" | "server" | "fallback";

export function RuntimeContentGate({ children }: { children: ReactNode }) {
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
        console.warn("TractusLab is using packaged content fallback", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div key={`runtime-catalog-${catalogVersion}`}>
      {children}
      {publicContentEnabled() && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-50 hidden rounded-full border border-white/10 bg-[#07110f]/90 px-3 py-1.5 text-[10px] font-medium text-white/45 shadow-xl backdrop-blur md:block">
          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status === "server" ? "bg-emerald-300" : status === "syncing" ? "animate-pulse bg-cyan-300" : status === "fallback" ? "bg-amber-300" : "bg-white/25"}`} />
          {status === "server" ? `${overlayCount} published server version${overlayCount === 1 ? "" : "s"} active` : status === "syncing" ? "Checking published content…" : status === "fallback" ? "Packaged content fallback" : "Packaged content"}
        </div>
      )}
    </div>
  );
}
