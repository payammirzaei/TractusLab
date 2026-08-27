"use client";

import { useMemo, useState } from "react";
import { BrainCircuit, ExternalLink, LibraryBig, X } from "lucide-react";
import { buildTractusMindUrl, tractusMindContextText, type TractusMindContext } from "@/lib/tractusmind";

export function AskTractusMind({ context }: { context: TractusMindContext }) {
  const [open, setOpen] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_TRACTUSMIND_URL?.trim() || "";
  const targetUrl = useMemo(() => {
    if (!baseUrl) return null;
    try {
      return buildTractusMindUrl(baseUrl, context);
    } catch {
      return null;
    }
  }, [baseUrl, context]);

  if (targetUrl) {
    return (
      <a href={targetUrl} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-800 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200">
        <BrainCircuit size={15} />
        Ask TractusMind
        <ExternalLink size={13} className="opacity-55 transition group-hover:translate-x-0.5" />
      </a>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-800 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200">
        <BrainCircuit size={15} />
        Ask TractusMind
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-400/20 dark:bg-slate-950/80">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><LibraryBig size={17} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.11em] text-blue-700 dark:text-blue-300">TractusMind integration point</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Find & Understand, directly from the lesson context.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close TractusMind panel" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><X size={15} /></button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">The UI and context handoff are ready. Configure <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-white/10">NEXT_PUBLIC_TRACTUSMIND_URL</code> to open a source-grounded TractusMind deep dive. TractusLab does not fabricate a fallback answer.</p>
          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300">Preview handoff context</summary>
            <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-500 dark:text-slate-400">{tractusMindContextText(context)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
