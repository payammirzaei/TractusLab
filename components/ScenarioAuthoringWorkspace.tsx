"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ServerContentWorkflow } from "@/components/ServerContentWorkflow";
import { scenarioDocuments } from "@/data/content-registry";
import { authoringReadiness, authoringStatusLabel } from "@/lib/authoring-ux";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  createScenarioTemplate,
  parseScenarioDocument,
  serializeScenarioDocument,
  type ScenarioContentDocument,
} from "@/lib/content";
import type { LearningDepth } from "@/lib/simulator";

type EditorMode = "compose" | "json";
type ScenarioField = "title" | "shortTitle" | "useCase" | "asset" | "goal" | "supplierLabel" | "manufacturerLabel";
type StepField = "technicalName" | "question" | "business" | "architecture" | "developer" | "whyNeeded" | "withoutIt" | "actionLabel" | "payload";

export function ScenarioAuthoringWorkspace() {
  const [raw, setRaw] = useState(() => serializeScenarioDocument(scenarioDocuments[0]));
  const [selectedPackagedId, setSelectedPackagedId] = useState(scenarioDocuments[0].metadata.id);
  const [depth, setDepth] = useState<LearningDepth>("business");
  const [previewStep, setPreviewStep] = useState(0);
  const [editorStep, setEditorStep] = useState(0);
  const [mode, setMode] = useState<EditorMode>("compose");
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseScenarioDocument(raw), [raw]);
  const document = parsed.document;
  const readiness = useMemo(() => authoringReadiness(document, parsed.errors), [document, parsed.errors]);

  useEffect(() => {
    setSavedDraftAvailable(Boolean(window.localStorage.getItem(CONTENT_DRAFT_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    setPreviewStep(0);
    setEditorStep(0);
  }, [document?.metadata.id]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function loadPackaged(id: string) {
    const next = scenarioDocuments.find((item) => item.metadata.id === id);
    if (!next) return;
    setSelectedPackagedId(id);
    setRaw(serializeScenarioDocument(next));
    setMode("compose");
    setDirty(false);
    setMessage(`Loaded ${next.scenario.shortTitle} ${next.metadata.version}. Editing will create a local draft.`);
  }

  function createDraft() {
    const next = createScenarioTemplate();
    setSelectedPackagedId("");
    setRaw(serializeScenarioDocument(next));
    setMode("compose");
    setDirty(true);
    setMessage("Started a new local draft.");
  }

  function saveDraft() {
    window.localStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, raw);
    setSavedDraftAvailable(true);
    setDirty(false);
    setMessage(parsed.valid ? "Draft saved locally." : "Draft saved locally with validation errors.");
  }

  function restoreDraft() {
    const stored = window.localStorage.getItem(CONTENT_DRAFT_STORAGE_KEY);
    if (!stored) return;
    setSelectedPackagedId("");
    setRaw(stored);
    setMode("compose");
    setDirty(false);
    setMessage("Restored the last local draft.");
  }

  function clearDraft() {
    window.localStorage.removeItem(CONTENT_DRAFT_STORAGE_KEY);
    setSavedDraftAvailable(false);
    setMessage("Saved local draft cleared.");
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRaw(await file.text());
    setSelectedPackagedId("");
    setMode("json");
    setDirty(true);
    setMessage(`Imported ${file.name}. Review validation before saving or publishing.`);
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

  function updateDocument(mutator: (draft: ScenarioContentDocument) => void) {
    if (!document) return;
    const next = structuredClone(document);
    mutator(next);
    next.metadata.status = "draft";
    setSelectedPackagedId("");
    setRaw(serializeScenarioDocument(next));
    setDirty(true);
    setMessage("");
  }

  function updateScenario(field: ScenarioField, value: string) {
    updateDocument((draft) => {
      draft.scenario[field] = value;
    });
  }

  function updateStep(field: StepField, value: string) {
    updateDocument((draft) => {
      const step = draft.scenario.steps[Math.min(editorStep, draft.scenario.steps.length - 1)];
      if (step) step[field] = value;
    });
  }

  function updateTags(value: string) {
    updateDocument((draft) => {
      draft.metadata.tags = value.split(",").map((item) => item.trim()).filter(Boolean);
    });
  }

  function updateMetadata(field: "version" | "summary", value: string) {
    updateDocument((draft) => {
      draft.metadata[field] = value;
    });
  }

  const currentEditorStep = document?.scenario.steps[Math.min(editorStep, Math.max((document?.scenario.steps.length ?? 1) - 1, 0))];

  return (
    <main className="min-h-screen pb-16">
      <header className="learner-nav">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-sm font-black text-amber-100">T</span>
            <span><span className="block text-sm font-semibold">TractusLab Studio</span><span className="hidden text-[10px] uppercase tracking-[0.16em] text-white/28 sm:block">Internal content authoring</span></span>
          </Link>
          <div className="flex items-center gap-2"><Link href="/scenarios" className="button-ghost">Learner view</Link><Link href="/account" className="button-ghost hidden sm:inline-flex">Account</Link><span className="hidden rounded-xl border border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/28 md:inline-flex">Schema 1.0</span></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-4 md:px-8">
        <section className="grid gap-5 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="eyebrow">Content studio</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">Write like a teacher. Review like a product team.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/45">Compose common content in structured fields, inspect the exact learner experience live, then use Advanced JSON only when you need the full contract.</p>
          </div>
          <div className="surface-panel p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Review readiness</p><p className="mt-1 text-sm font-semibold text-white/70">{authoringStatusLabel(readiness.percent)}</p></div><span className="text-2xl font-semibold tracking-[-0.04em]">{readiness.percent}%</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${readiness.percent}%` }} /></div>
            <div className="mt-4 grid gap-1.5">{readiness.checks.slice(0, 4).map((check) => <span key={check.id} className={`text-[11px] ${check.complete ? "text-emerald-200/65" : "text-white/28"}`}>{check.complete ? "✓" : "○"} {check.label}</span>)}</div>
          </div>
        </section>

        <ServerContentWorkflow document={document} />

        <section className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_minmax(360px,.85fr)]">
          <aside className="surface-panel h-fit p-4 xl:sticky xl:top-24">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Scenario library</p><span className="text-xs text-white/24">{scenarioDocuments.length}</span></div>
            <div className="mt-4 space-y-2">
              {scenarioDocuments.map((item) => (
                <button key={item.metadata.id} type="button" onClick={() => loadPackaged(item.metadata.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedPackagedId === item.metadata.id ? "border-emerald-300/25 bg-emerald-300/[0.055]" : "border-white/7 bg-black/10 hover:border-white/14"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{item.scenario.shortTitle}</span><span className="text-[10px] text-emerald-300/60">v{item.metadata.version}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/30">{item.scenario.useCase}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-white/8 pt-4">
              <button type="button" onClick={createDraft} className="button-primary w-full">+ New scenario</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="button-ghost mt-2 w-full">Import JSON</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importFile} className="hidden" />
              {savedDraftAvailable && <button type="button" onClick={restoreDraft} className="button-secondary mt-2 w-full">Restore saved draft</button>}
            </div>
          </aside>

          <section className="min-w-0 surface-panel p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Editor</p>{dirty && <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100/70">UNSAVED</span>}</div>
                <p className="mt-1 text-xs text-white/24">{document ? `${document.scenario.shortTitle} · ${document.metadata.status} · v${document.metadata.version}` : "Document needs JSON repair"}</p>
              </div>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={saveDraft} className="button-secondary">Save local draft</button><button type="button" onClick={exportJson} className="button-ghost">Export</button></div>
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/8 bg-black/15 p-1" role="tablist" aria-label="Editor mode">
              <button role="tab" aria-selected={mode === "compose"} onClick={() => setMode("compose")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${mode === "compose" ? "bg-white/10 text-white" : "text-white/35"}`}>Compose</button>
              <button role="tab" aria-selected={mode === "json"} onClick={() => setMode("json")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${mode === "json" ? "bg-white/10 text-white" : "text-white/35"}`}>Advanced JSON</button>
            </div>

            {mode === "compose" && document ? (
              <div className="mt-5 space-y-7">
                <EditorGroup title="Scenario identity" description="The business story a learner sees before protocol details.">
                  <div className="grid gap-3 md:grid-cols-2"><TextField label="Title" value={document.scenario.title} onChange={(value) => updateScenario("title", value)} /><TextField label="Short title" value={document.scenario.shortTitle} onChange={(value) => updateScenario("shortTitle", value)} /><TextField label="Use case" value={document.scenario.useCase} onChange={(value) => updateScenario("useCase", value)} /><TextField label="Asset" value={document.scenario.asset} onChange={(value) => updateScenario("asset", value)} /><TextField label="Provider label" value={document.scenario.supplierLabel} onChange={(value) => updateScenario("supplierLabel", value)} /><TextField label="Consumer label" value={document.scenario.manufacturerLabel} onChange={(value) => updateScenario("manufacturerLabel", value)} /></div>
                  <TextAreaField label="Learning goal" value={document.scenario.goal} onChange={(value) => updateScenario("goal", value)} rows={3} />
                </EditorGroup>

                <EditorGroup title="Discovery metadata" description="Used by content management and scenario discovery.">
                  <div className="grid gap-3 md:grid-cols-[180px_1fr]"><TextField label="Version" value={document.metadata.version} onChange={(value) => updateMetadata("version", value)} /><TextField label="Tags (comma separated)" value={document.metadata.tags.join(", ")} onChange={updateTags} /></div>
                  <TextAreaField label="Summary" value={document.metadata.summary} onChange={(value) => updateMetadata("summary", value)} rows={2} />
                </EditorGroup>

                <EditorGroup title="Learning steps" description="Edit the same moment across Manager, Architect and Developer depth.">
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{document.scenario.steps.map((step, index) => <button key={step.id} type="button" onClick={() => { setEditorStep(index); setPreviewStep(index); }} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${editorStep === index ? "border-emerald-300/25 bg-emerald-300/[0.06] text-white" : "border-white/7 text-white/35"}`}><span className="mr-2 text-white/24">{index + 1}</span>{step.technicalName}</button>)}</div>
                  {currentEditorStep && <div className="mt-4 space-y-3 rounded-3xl border border-white/8 bg-black/10 p-4"><div className="grid gap-3 md:grid-cols-2"><TextField label="Technical name" value={currentEditorStep.technicalName} onChange={(value) => updateStep("technicalName", value)} /><TextField label="Action label" value={currentEditorStep.actionLabel} onChange={(value) => updateStep("actionLabel", value)} /></div><TextAreaField label="Learner question" value={currentEditorStep.question} onChange={(value) => updateStep("question", value)} rows={2} /><TextAreaField label="Manager explanation" value={currentEditorStep.business} onChange={(value) => updateStep("business", value)} rows={4} /><TextAreaField label="Architect explanation" value={currentEditorStep.architecture} onChange={(value) => updateStep("architecture", value)} rows={4} /><TextAreaField label="Developer explanation" value={currentEditorStep.developer} onChange={(value) => updateStep("developer", value)} rows={4} /><div className="grid gap-3 md:grid-cols-2"><TextAreaField label="Why needed" value={currentEditorStep.whyNeeded} onChange={(value) => updateStep("whyNeeded", value)} rows={3} /><TextAreaField label="What breaks without it" value={currentEditorStep.withoutIt} onChange={(value) => updateStep("withoutIt", value)} rows={3} /></div><TextAreaField label="Developer payload (optional)" value={currentEditorStep.payload ?? ""} onChange={(value) => updateStep("payload", value)} rows={3} mono /></div>}
                </EditorGroup>

                <div className="rounded-2xl border border-amber-300/12 bg-amber-300/[0.025] p-4 text-xs leading-5 text-amber-100/55">Challenge options, map focus, glossary terms and low-level contract fields remain available in Advanced JSON for now. The structured editor intentionally covers the high-frequency authoring workflow first.</div>
              </div>
            ) : mode === "compose" ? (
              <div className="mt-5 rounded-3xl border border-rose-300/15 bg-rose-300/[0.035] p-6"><h3 className="font-semibold text-rose-100">Compose mode is unavailable while JSON is invalid.</h3><p className="mt-2 text-sm leading-6 text-white/38">Open Advanced JSON, repair the issues below, and the structured editor will come back automatically.</p><button type="button" onClick={() => setMode("json")} className="button-danger mt-4">Open Advanced JSON</button></div>
            ) : (
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/32">Canonical document</p><p className="mt-1 text-xs text-white/24">Full schema access for advanced edits.</p></div><button type="button" onClick={() => void copyJson()} className="button-ghost">Copy JSON</button></div>
                <textarea value={raw} onChange={(event) => { setRaw(event.target.value); setSelectedPackagedId(""); setDirty(true); setMessage(""); }} spellCheck={false} aria-label="Scenario JSON" className="mt-4 min-h-[680px] w-full resize-y rounded-2xl border border-white/10 bg-[#050b09] p-4 font-mono text-[12px] leading-5 text-white/70 outline-none transition focus:border-emerald-300/25 focus:ring-4 focus:ring-emerald-300/[0.025]" />
              </div>
            )}

            <div className={`mt-5 rounded-2xl border p-4 ${parsed.valid ? "border-emerald-300/16 bg-emerald-300/[0.035]" : "border-rose-300/18 bg-rose-300/[0.04]"}`} aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className={`text-sm font-semibold ${parsed.valid ? "text-emerald-200" : "text-rose-200"}`}>{parsed.valid ? "✓ Valid content document" : `${parsed.errors.length} validation issue${parsed.errors.length === 1 ? "" : "s"}`}</p>{savedDraftAvailable && <button type="button" onClick={clearDraft} className="text-xs text-white/30 hover:text-white/60">Clear saved draft</button>}</div>
              {!parsed.valid && <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-100/65">{parsed.errors.slice(0, 10).map((error) => <li key={error}>• {error}</li>)}{parsed.errors.length > 10 && <li>• …and {parsed.errors.length - 10} more</li>}</ul>}
              {message && <p className="mt-3 text-xs text-white/38">{message}</p>}
            </div>
          </section>

          <AuthoringPreview document={document} depth={depth} setDepth={setDepth} previewStep={previewStep} setPreviewStep={setPreviewStep} />
        </section>
      </div>
    </main>
  );
}

function EditorGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-white/30">{description}</p></div><div className="mt-4 space-y-3">{children}</div></section>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-medium text-white/42">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="input-field mt-2" /></label>;
}

function TextAreaField({ label, value, onChange, rows, mono = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; mono?: boolean }) {
  return <label className="block"><span className="text-xs font-medium text-white/42">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`input-field mt-2 resize-y leading-6 ${mono ? "font-mono text-xs" : ""}`} /></label>;
}

function AuthoringPreview({ document, depth, setDepth, previewStep, setPreviewStep }: { document: ScenarioContentDocument | null; depth: LearningDepth; setDepth: (value: LearningDepth) => void; previewStep: number; setPreviewStep: (value: number) => void }) {
  if (!document) return <aside className="surface-panel h-fit p-5 xl:sticky xl:top-24"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Learner preview</p><div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm leading-6 text-white/35">Preview becomes available when the document passes validation.</div></aside>;

  const scenario = document.scenario;
  const safeStep = Math.min(previewStep, scenario.steps.length - 1);
  const step = scenario.steps[safeStep];

  return (
    <aside className="surface-panel h-fit p-4 md:p-5 xl:sticky xl:top-24">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Live learner preview</p><p className="mt-1 text-xs text-white/24">{document.metadata.status} · v{document.metadata.version}</p></div><span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-white/32">{scenario.steps.length} steps · {scenario.challenges.length} boss cases</span></div>
      <div className="mt-5 rounded-3xl border border-emerald-300/14 bg-emerald-300/[0.035] p-5"><p className="text-xs uppercase tracking-[0.16em] text-emerald-300/60">{scenario.useCase}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{scenario.title}</h2><p className="mt-3 text-sm leading-6 text-white/42">{scenario.goal}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/35">{document.metadata.tags.map((tag) => <span key={tag} className="rounded-full border border-white/9 px-2.5 py-1">{tag}</span>)}</div></div>
      <div className="mt-4 grid grid-cols-3 rounded-2xl border border-white/8 bg-black/15 p-1">{(["business", "architecture", "developer"] as LearningDepth[]).map((item) => <button key={item} type="button" onClick={() => setDepth(item)} className={`rounded-xl px-2 py-2 text-[11px] capitalize ${depth === item ? "bg-white/10 text-white" : "text-white/32"}`}>{item === "business" ? "Manager" : item === "architecture" ? "Architect" : "Developer"}</button>)}</div>
      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">{scenario.steps.map((item, index) => <button key={item.id} type="button" onClick={() => setPreviewStep(index)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${safeStep === index ? "border-emerald-300/28 bg-emerald-300/[0.07] text-emerald-100" : "border-white/7 text-white/26"}`}>{index + 1}</button>)}</div>
      <div className="mt-4 rounded-3xl border border-white/8 bg-black/10 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/55">{step.technicalName}</p><h3 className="mt-2 text-lg font-semibold">{step.question}</h3><p className="mt-4 text-sm leading-6 text-white/52">{step[depth]}</p><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div className="rounded-2xl border border-white/7 p-3"><p className="text-[10px] uppercase tracking-wider text-white/23">Why needed</p><p className="mt-2 text-xs leading-5 text-white/38">{step.whyNeeded}</p></div><div className="rounded-2xl border border-white/7 p-3"><p className="text-[10px] uppercase tracking-wider text-white/23">Without it</p><p className="mt-2 text-xs leading-5 text-white/38">{step.withoutIt}</p></div></div></div>
      {scenario.challenges[0] && <div className="mt-4 rounded-3xl border border-amber-300/12 bg-amber-300/[0.025] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/55">Boss Fight sample</p><h3 className="mt-2 font-semibold">{scenario.challenges[0].title}</h3><p className="mt-2 text-sm leading-6 text-white/38">{scenario.challenges[0].symptom}</p></div>}
    </aside>
  );
}
