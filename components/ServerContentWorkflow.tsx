"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ScenarioContentDocument } from "@/lib/content";
import {
  archiveServerContent,
  createServerContent,
  createServerRevision,
  getContentAccount,
  getServerContent,
  listServerContent,
  publishServerContent,
  reviewServerContent,
  submitServerContent,
  type ContentAccount,
  type ServerContentDetail,
  type ServerContentSummary,
} from "@/lib/content-server";
import {
  canAccessContent,
  canAuthor,
  canPublish,
  canReview,
  nextActionLabel,
  statusLabel,
  workflowStageIndex,
  workflowStages,
} from "@/lib/content-workflow";
import { serverSyncEnabled } from "@/lib/server-sync";

export function ServerContentWorkflow({ document }: { document: ScenarioContentDocument | null }) {
  const [account, setAccount] = useState<ContentAccount | null>(null);
  const [items, setItems] = useState<ServerContentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServerContentDetail | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const enabled = serverSyncEnabled();

  async function refresh(preferredId?: string) {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setError("");
    const nextAccount = await getContentAccount();
    setAccount(nextAccount);
    if (!nextAccount || !canAccessContent(nextAccount.role)) {
      setItems([]);
      setSelectedId(null);
      setDetail(null);
      setLoading(false);
      return;
    }
    const nextItems = await listServerContent();
    setItems(nextItems);
    const nextSelected = preferredId && nextItems.some((item) => item.id === preferredId)
      ? preferredId
      : selectedId && nextItems.some((item) => item.id === selectedId)
        ? selectedId
        : nextItems[0]?.id ?? null;
    setSelectedId(nextSelected);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!selectedId || !account || !canAccessContent(account.role)) {
      setDetail(null);
      return;
    }
    void getServerContent(selectedId).then(setDetail).catch((err: Error) => setError(err.message));
  }, [account, selectedId]);

  const counts = useMemo(() => ({
    draft: items.filter((item) => item.status === "draft" || item.status === "changes_requested").length,
    review: items.filter((item) => item.status === "in_review").length,
    approved: items.filter((item) => item.status === "approved").length,
    live: items.filter((item) => item.status === "published").length,
  }), [items]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const editorServerItem = document ? items.find((item) => item.scenario_id === document.metadata.id) ?? null : null;
  const pushBlocked = Boolean(editorServerItem && ["in_review", "approved", "archived"].includes(editorServerItem.status));

  async function runAction(action: () => Promise<ServerContentDetail>, successMessage: string) {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const next = await action();
      setDetail(next);
      setSelectedId(next.item.id);
      setReviewNote("");
      setMessage(successMessage);
      await refresh(next.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function pushEditorDocument() {
    if (!document || !account || !canAuthor(account.role)) return;
    await runAction(
      () => editorServerItem
        ? createServerRevision(editorServerItem.id, document)
        : createServerContent(document),
      editorServerItem ? "New server revision created." : "Server draft created.",
    );
  }

  if (!enabled) {
    return (
      <section className="mb-5 rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30">Review workflow</p>
            <h2 className="mt-2 text-xl font-semibold">Local authoring stays fast for now.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Server review, roles and publishing are ready in code. They activate when the API is configured; local drafts remain available without it.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/35">Server workflow offline</span>
        </div>
      </section>
    );
  }

  if (loading) {
    return <section className="mb-5 rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-5 text-sm text-white/40">Loading content workflow…</section>;
  }

  if (!account || !canAccessContent(account.role)) {
    return (
      <section className="mb-5 rounded-[1.75rem] border border-amber-300/15 bg-amber-300/[0.025] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/60">Authoring access</p>
            <h2 className="mt-2 text-xl font-semibold">A content role is required for server publishing.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">You can still edit and export local drafts. An Admin can assign Author or Reviewer access when server mode is enabled.</p>
          </div>
          <Link href="/account" className="rounded-full border border-amber-300/20 px-4 py-2 text-sm text-amber-100/75">Open account →</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5 overflow-hidden rounded-[1.9rem] border border-white/10 bg-gradient-to-b from-white/[0.035] to-white/[0.015]">
      <div className="border-b border-white/8 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Publishing workflow</p>
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/70">{account.role}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Draft → Review → Approval → Publish</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">The editor stays flexible. The server workflow becomes strict only when a revision is sent for review.</p>
          </div>
          {canAuthor(account.role) && (
            <button
              type="button"
              disabled={!document || pushBlocked || actionLoading}
              onClick={pushEditorDocument}
              className="rounded-full bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#07110f] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {editorServerItem ? "+ Create server revision" : "Push editor draft →"}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <Metric label="Draft / changes" value={counts.draft} />
          <Metric label="In review" value={counts.review} />
          <Metric label="Approved" value={counts.approved} />
          <Metric label="Published" value={counts.live} />
        </div>

        {pushBlocked && <p className="mt-3 text-xs text-amber-100/60">The matching server item is currently {statusLabel(editorServerItem!.status).toLowerCase()}. Finish that workflow before creating another revision.</p>}
        {message && <p className="mt-3 text-xs text-emerald-200/70">✓ {message}</p>}
        {error && <p className="mt-3 text-xs text-rose-200/80">{error}</p>}
      </div>

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-1 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Server content</p>
            <span className="text-xs text-white/25">{items.length}</span>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {items.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-white/32">No server revisions yet. Push the current valid editor document to start.</div>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === item.id ? "border-emerald-300/25 bg-emerald-300/[0.055]" : "border-white/8 bg-black/10 hover:border-white/15"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-white/30">{item.scenario_id} · revision {item.latest_revision}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <WorkflowRail status={item.status} compact />
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {!selected || !detail ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/28">Select a server content item to inspect its workflow.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><StatusPill status={selected.status} /><span className="text-xs text-white/30">Revision {selected.latest_revision}</span></div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{selected.title}</h3>
                  <p className="mt-1 text-sm text-white/32">{nextActionLabel(selected.status, account.role)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canAuthor(account.role) && (selected.status === "draft" || selected.status === "changes_requested") && (
                    <button disabled={actionLoading} onClick={() => runAction(() => submitServerContent(selected.id), "Revision sent to review.")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Submit for review</button>
                  )}
                  {canPublish(account.role) && selected.status === "approved" && (
                    <button disabled={actionLoading} onClick={() => runAction(() => publishServerContent(selected.id), "Revision published.")} className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-[#07110f] disabled:opacity-40">Publish</button>
                  )}
                  {canPublish(account.role) && selected.status === "published" && (
                    <button disabled={actionLoading} onClick={() => runAction(() => archiveServerContent(selected.id), "Content archived.")} className="rounded-full border border-white/12 px-4 py-2 text-xs text-white/50 disabled:opacity-40">Archive</button>
                  )}
                </div>
              </div>

              <WorkflowRail status={selected.status} />

              {canReview(account.role) && selected.status === "in_review" && (
                <div className="mt-5 rounded-3xl border border-amber-300/12 bg-amber-300/[0.025] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-100/55">Reviewer decision</p>
                  <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Review note (optional)" className="mt-3 min-h-20 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-amber-300/20" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={actionLoading} onClick={() => runAction(() => reviewServerContent(selected.id, "approve", reviewNote), "Revision approved." )} className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-[#07110f] disabled:opacity-40">Approve</button>
                    <button disabled={actionLoading} onClick={() => runAction(() => reviewServerContent(selected.id, "request_changes", reviewNote), "Changes requested." )} className="rounded-full border border-amber-300/20 px-4 py-2 text-xs text-amber-100/70 disabled:opacity-40">Request changes</button>
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-white/8 pt-5">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Revision history</p><span className="text-xs text-white/25">{detail.revisions.length} revisions</span></div>
                <div className="mt-3 space-y-2">
                  {detail.revisions.map((revision) => (
                    <div key={revision.id} className="rounded-2xl border border-white/8 bg-black/10 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-semibold">r{revision.revision_number}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] capitalize text-white/40">{revision.state.replace("_", " ")}</span></div><span className="text-[10px] text-white/25">{new Date(revision.created_at).toLocaleString()}</span></div>
                      {revision.review_note && <p className="mt-2 text-xs leading-5 text-white/42">“{revision.review_note}”</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3"><p className="text-[10px] uppercase tracking-[0.14em] text-white/25">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

function StatusPill({ status }: { status: ServerContentSummary["status"] }) {
  const style = status === "published"
    ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100/70"
    : status === "approved"
      ? "border-sky-300/20 bg-sky-300/[0.05] text-sky-100/70"
      : status === "in_review"
        ? "border-amber-300/20 bg-amber-300/[0.05] text-amber-100/70"
        : status === "changes_requested"
          ? "border-rose-300/20 bg-rose-300/[0.04] text-rose-100/70"
          : "border-white/10 bg-white/[0.03] text-white/40";
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${style}`}>{statusLabel(status)}</span>;
}

function WorkflowRail({ status, compact = false }: { status: ServerContentSummary["status"]; compact?: boolean }) {
  const activeIndex = workflowStageIndex(status);
  return (
    <div className={compact ? "mt-3" : "mt-6 rounded-3xl border border-white/8 bg-black/10 p-4"}>
      <div className="grid grid-cols-4 gap-1.5">
        {workflowStages.map((stage, index) => (
          <div key={stage} className="min-w-0">
            <div className={`h-1.5 rounded-full ${index <= activeIndex ? "bg-emerald-300/55" : "bg-white/8"}`} />
            {!compact && <p className={`mt-2 truncate text-[10px] ${index <= activeIndex ? "text-white/55" : "text-white/20"}`}>{stage}</p>}
          </div>
        ))}
      </div>
      {!compact && status === "changes_requested" && <p className="mt-3 text-xs text-rose-100/55">Review returned this revision to the author with requested changes.</p>}
    </div>
  );
}
