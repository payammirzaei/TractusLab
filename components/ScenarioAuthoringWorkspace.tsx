"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ServerContentWorkflow } from "@/components/ServerContentWorkflow";
import { scenarioDocuments } from "@/data/content-registry";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  createScenarioTemplate,
  parseScenarioDocument,
  serializeScenarioDocument,
  type ScenarioContentDocument,
} from "@/lib/content";
import type { LearningDepth } from "@/lib/simulator";

export function ScenarioAuthoringWorkspace() {
  const [raw, setRaw] = useState(() => serializeScenarioDocument(scenarioDocuments[0]));
  const [selectedPackagedId, setSelectedPackagedId] = useState(scenarioDocuments[0].metadata.id);
  const [depth, setDepth] = useState<LearningDepth>("business");
  const [previewStep, setPreviewStep] = useState(0);
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseScenarioDocument(raw), [raw]);
  const document = parsed.document;

  useEffect(() => {
    setSavedDraftAvailable(Boolean(window.localStorage.getItem(CONTENT_DRAFT_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    setPreviewStep(0);
  }, [document?.metadata.id]);

  function loadPackaged(id: string) {
    const next = scenarioDocuments.find((item) => item.metadata.id === id);
    if (!next) return;
    setSelectedPackagedId(id);
    setRaw(serializeScenarioDocument(next));
    setMessage(`Loaded ${next.scenario.shortTitle} ${next.metadata.version}.`);
  }

  function createDraft() {
    const next = createScenarioTemplate();
    setSelectedPackagedId("");
    setRaw(serializeScenarioDocument(next));
    setMessage("Started a new local draft.");
  }

  function saveDraft() {
    window.localStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, raw);
    setSavedDraftAvailable(true);
    setMessage(parsed.valid ? "Draft saved locally." : "Draft saved locally with validation errors.");
  }

  function restoreDraft() {
    const stored = window.localStorage.getItem(CONTENT_DRAFT_STORAGE_KEY);
    if (!stored) return;
    setSelectedPackagedId("");
    setRaw(stored);
    setMessage("Restored local draft.");
  }

  function clearDraft() {
    window.localStorage.removeItem(CONTENT_DRAFT_STORAGE_KEY);
    setSavedDraftAvailable(false);
    setMessage("Local draft cleared.");
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRaw(await file.text());
    setSelectedPackagedId("");
    setMessage(`Imported ${file.name}.`);
    event.target.value = "";
  }

  async function copyJson() {
    await navigator.clipboard.writeText(raw);
    setMessage("JSON copied to clipboard.");
  }

  function exportJson() {
    if (!document) {
      setMessage("Fix validation errors before exporting a canonical document.");
      return;
    }
    const blob = new Blob([serializeScenarioDocument(document)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.metadata.id}.scenario.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Scenario JSON exported.");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">← TractusLab</Link>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.05] px-3 py-1 text-xs text-amber-100/70">Internal authoring studio</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/scenarios" className="rounded-full border border-white/10 px-3 py-1.5 text-white/50 transition hover:text-white/80">Scenario Hub</Link>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-white/35">Schema v1.0</span>
          </div>
        </header>

        <section className="py-9 md:py-11">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Content studio</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Write fast locally. Publish carefully as a team.</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/48">Local editing stays instant. Server workflow adds roles, revisions and review only when content is ready to move toward production.</p>
            </div>
            <div className="grid min-w-[260px] grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/35">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"><span className="block text-base font-semibold text-white/70">1</span>Edit</div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"><span className="block text-base font-semibold text-white/70">2</span>Review</div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"><span className="block text-base font-semibold text-white/70">3</span>Publish</div>
            </div>
          </div>
        </section>

        <ServerContentWorkflow document={document} />

        <section className="grid gap-4 xl:grid-cols-[250px_minmax(0,1.05fr)_minmax(340px,.95fr)]">
          <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Packaged content</p>
              <span className="text-xs text-white/25">{scenarioDocuments.length}</span>
            </div>
            <div className="mt-4 space-y-2">
              {scenarioDocuments.map((item) => (
                <button
                  key={item.metadata.id}
                  type="button"
                  onClick={() => loadPackaged(item.metadata.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${selectedPackagedId === item.metadata.id ? "border-emerald-300/30 bg-emerald-300/[0.07]" : "border-white/8 bg-black/10 hover:border-white/15"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{item.scenario.shortTitle}</span>
                    <span className="text-[10px] text-emerald-300/70">v{item.metadata.version}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/32">{item.scenario.useCase}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <button type="button" onClick={createDraft} className="w-full rounded-full bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#07110f] transition hover:translate-y-[-1px]">+ New scenario</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/65 transition hover:border-white/20 hover:text-white/80">Import JSON</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importFile} className="hidden" />
              {savedDraftAvailable && (
                <button type="button" onClick={restoreDraft} className="mt-2 w-full rounded-full border border-amber-300/20 px-4 py-2.5 text-sm text-amber-100/70">Restore local draft</button>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Scenario document</p>
                <p className="mt-1 text-xs text-white/25">Canonical JSON · validated continuously</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveDraft} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/20">Save draft</button>
                <button type="button" onClick={copyJson} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/20">Copy</button>
                <button type="button" onClick={exportJson} className="rounded-full border border-emerald-300/25 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-300/[0.05]">Export</button>
              </div>
            </div>

            <textarea
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setSelectedPackagedId("");
                setMessage("");
              }}
              spellCheck={false}
              className="mt-4 min-h-[650px] w-full resize-y rounded-2xl border border-white/10 bg-[#050b09] p-4 font-mono text-[12px] leading-5 text-white/70 outline-none transition focus:border-emerald-300/25 focus:ring-4 focus:ring-emerald-300/[0.025]"
            />

            <div className={`mt-4 rounded-2xl border p-4 ${parsed.valid ? "border-emerald-300/20 bg-emerald-300/[0.05]" : "border-rose-300/20 bg-rose-300/[0.04]"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${parsed.valid ? "text-emerald-200" : "text-rose-200"}`}>{parsed.valid ? "✓ Valid content document" : `${parsed.errors.length} validation issue${parsed.errors.length === 1 ? "" : "s"}`}</p>
                {savedDraftAvailable && <button type="button" onClick={clearDraft} className="text-xs text-white/30 hover:text-white/60">Clear saved draft</button>}
              </div>
              {!parsed.valid && (
                <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-100/65">
                  {parsed.errors.slice(0, 10).map((error) => <li key={error}>• {error}</li>)}
                  {parsed.errors.length > 10 && <li>• …and {parsed.errors.length - 10} more</li>}
                </ul>
              )}
              {message && <p className="mt-3 text-xs text-white/38">{message}</p>}
            </div>
          </section>

          <AuthoringPreview document={document} depth={depth} setDepth={setDepth} previewStep={previewStep} setPreviewStep={setPreviewStep} />
        </section>
      </div>
    </main>
  );
}

function AuthoringPreview({
  document,
  depth,
  setDepth,
  previewStep,
  setPreviewStep,
}: {
  document: ScenarioContentDocument | null;
  depth: LearningDepth;
  setDepth: (value: LearningDepth) => void;
  previewStep: number;
  setPreviewStep: (value: number) => void;
}) {
  if (!document) {
    return (
      <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Preview</p>
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm leading-6 text-white/35">Preview becomes available when the document passes validation.</div>
      </aside>
    );
  }

  const scenario = document.scenario;
  const safeStep = Math.min(previewStep, scenario.steps.length - 1);
  const step = scenario.steps[safeStep];

  return (
    <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Live learner preview</p>
          <p className="mt-1 text-xs text-white/25">{document.metadata.status} · v{document.metadata.version}</p>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/35">{scenario.steps.length} steps · {scenario.challenges.length} boss cases</span>
      </div>

      <div className="mt-5 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/65">{scenario.useCase}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{scenario.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/45">{scenario.goal}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/38">
          {document.metadata.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1">{tag}</span>)}
        </div>
      </div>

      <div className="mt-4 flex rounded-full border border-white/10 bg-black/20 p-1">
        {(["business", "architecture", "developer"] as LearningDepth[]).map((item) => (
          <button key={item} type="button" onClick={() => setDepth(item)} className={`flex-1 rounded-full px-2 py-2 text-xs capitalize transition ${depth === item ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>{item}</button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {scenario.steps.map((item, index) => (
          <button key={item.id} type="button" onClick={() => setPreviewStep(index)} className={`rounded-full border px-2.5 py-1 text-[10px] transition ${safeStep === index ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100" : "border-white/8 text-white/28 hover:text-white/50"}`}>{index + 1}</button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-black/15 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/60">{step.technicalName}</p>
        <h3 className="mt-2 text-lg font-semibold">{step.question}</h3>
        <p className="mt-4 text-sm leading-6 text-white/55">{step[depth]}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="rounded-2xl border border-white/8 p-3"><p className="text-[10px] uppercase tracking-wider text-white/25">Why needed</p><p className="mt-2 text-xs leading-5 text-white/42">{step.whyNeeded}</p></div>
          <div className="rounded-2xl border border-white/8 p-3"><p className="text-[10px] uppercase tracking-wider text-white/25">Without it</p><p className="mt-2 text-xs leading-5 text-white/42">{step.withoutIt}</p></div>
        </div>
      </div>

      {scenario.challenges[0] && (
        <div className="mt-4 rounded-3xl border border-amber-300/15 bg-amber-300/[0.035] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/60">Boss Fight sample</p>
          <h3 className="mt-2 font-semibold">{scenario.challenges[0].title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/42">{scenario.challenges[0].symptom}</p>
        </div>
      )}
    </aside>
  );
}
