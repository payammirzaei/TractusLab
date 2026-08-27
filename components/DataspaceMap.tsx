"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Box,
  Braces,
  Car,
  CircleCheck,
  Database,
  Factory,
  Info,
  Link2,
  Minus,
  MousePointerClick,
  Network,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { FlowDirection } from "@/lib/simulator";

type MapNode = {
  id: string;
  label: string;
  description: string;
  learnerTip: string;
};

const nodeDetails: MapNode[] = [
  { id: "supplier", label: "Data Provider", description: "Owns the source data and decides under which conditions it can be shared.", learnerTip: "Think: control stays with the company that owns the data." },
  { id: "supplier-edc", label: "Provider EDC", description: "The provider-side connector exposes offers, negotiates conditions and sends governed data.", learnerTip: "Think: this is the provider's controlled doorway into the dataspace." },
  { id: "dataspace", label: "Governed Exchange", description: "A shared trust and governance model connects participants without creating one central data lake.", learnerTip: "Think: connect companies without taking ownership of their data." },
  { id: "consumer-edc", label: "Consumer EDC", description: "The consumer-side connector discovers offers, negotiates access and receives data under agreed rules.", learnerTip: "Think: this is the consumer's controlled doorway into the dataspace." },
  { id: "manufacturer", label: "Data Consumer", description: "Needs trusted external data for a concrete business purpose and must respect the provider's usage rules.", learnerTip: "Think: needing the data does not automatically grant access to it." },
  { id: "identity", label: "Identity", description: "Establishes who the participants are before sensitive business interactions can be trusted.", learnerTip: "No trusted identity → no meaningful business trust." },
  { id: "policy", label: "Policy", description: "Defines what a consumer may do with data, under which conditions and for how long.", learnerTip: "Access is not just yes/no; usage conditions travel with the agreement." },
  { id: "dtr", label: "Digital Twin Registry", description: "Helps participants find the digital representation of a physical asset using shared identifiers.", learnerTip: "Use it when the question is: where is the twin for this asset?" },
  { id: "semantic-model", label: "Semantics", description: "Gives both sides the same machine-readable meaning for fields, structures and business concepts.", learnerTip: "Same JSON shape does not guarantee the same meaning." },
  { id: "digital-twin", label: "Digital Twin", description: "Represents the relevant asset and exposes structured information about it through standardized submodels.", learnerTip: "The twin is the digital business object; the registry only helps you find it." },
];

const services: ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  { id: "identity", label: "Identity", icon: CircleCheck, hint: "Who are you?" },
  { id: "policy", label: "Policy", icon: ShieldCheck, hint: "May I use it?" },
  { id: "dtr", label: "DTR", icon: Database, hint: "Where is the twin?" },
  { id: "semantic-model", label: "Semantics", icon: Braces, hint: "What does it mean?" },
  { id: "digital-twin", label: "Digital Twin", icon: Box, hint: "Which asset?" },
] as const;

export function DataspaceMap({ focus, direction }: { focus: string[]; direction: FlowDirection }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const isActive = (id: string) => focus.includes(id);
  const selectedNode = useMemo(() => nodeDetails.find((node) => node.id === selectedNodeId) ?? null, [selectedNodeId]);
  const routeActive = ["supplier", "supplier-edc", "dataspace", "consumer-edc", "manufacturer"].some(isActive);
  const directionText = direction === "supplier-to-manufacturer"
    ? "Provider → Consumer"
    : direction === "manufacturer-to-supplier"
      ? "Consumer → Provider"
      : direction === "both"
        ? "Two-way exchange"
        : "Inside one participant";

  const DirectionIcon = direction === "supplier-to-manufacturer"
    ? ArrowRight
    : direction === "manufacturer-to-supplier"
      ? ArrowLeft
      : direction === "both"
        ? ArrowLeftRight
        : Minus;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,.10),transparent_45%),linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,250,.92))] p-5 shadow-sm md:p-6">
      <div className="pointer-events-none absolute inset-x-16 top-[46%] hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent md:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.28)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Live dataspace</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">Follow the highlight, then click any component to inspect what job it performs.</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-blue-700">
            <MousePointerClick size={13} strokeWidth={2} aria-hidden="true" />
            Interactive map · explore instead of memorizing
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
          <DirectionIcon className={routeActive ? "text-emerald-600" : "text-slate-400"} size={17} strokeWidth={1.9} aria-hidden="true" />
          <span className="text-[11px] font-medium text-slate-700">{directionText}</span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center">
        <Participant id="supplier" title="Data Provider" subtitle="Owns the source data" icon={Factory} active={isActive("supplier")} selected={selectedNodeId === "supplier"} onSelect={setSelectedNodeId} />
        <RouteConnector active={isActive("supplier-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Provider EDC" nodeActive={isActive("supplier-edc")} nodeId="supplier-edc" selected={selectedNodeId === "supplier-edc"} onSelect={setSelectedNodeId} />

        <button
          type="button"
          data-map-node="dataspace"
          onClick={() => setSelectedNodeId("dataspace")}
          className={`relative rounded-[1.75rem] border p-5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${isActive("dataspace") ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_45px_rgba(16,185,129,.10)]" : selectedNodeId === "dataspace" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
        >
          {isActive("dataspace") && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.26)]" />}
          <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border ${isActive("dataspace") ? "border-emerald-200 bg-white text-emerald-700" : selectedNodeId === "dataspace" ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <Network size={22} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">Governed exchange</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">No shared central database. Each participant keeps control.</p>
        </button>

        <RouteConnector active={isActive("consumer-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Consumer EDC" nodeActive={isActive("consumer-edc")} nodeId="consumer-edc" selected={selectedNodeId === "consumer-edc"} onSelect={setSelectedNodeId} />
        <Participant id="manufacturer" title="Data Consumer" subtitle="Needs trusted data" icon={Car} active={isActive("manufacturer")} selected={selectedNodeId === "manufacturer"} onSelect={setSelectedNodeId} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Supporting responsibilities</p>
          <p className="text-[10px] text-slate-500">Click one to inspect its job</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {services.map((service) => <ServiceNode key={service.id} service={service} active={isActive(service.id)} selected={selectedNodeId === service.id} onSelect={setSelectedNodeId} />)}
        </div>
      </div>

      {selectedNode && (
        <div className={`mt-4 rounded-[1.4rem] border p-4 transition-all ${isActive(selectedNode.id) ? "border-emerald-200 bg-emerald-50/80" : "border-blue-100 bg-blue-50/70"}`} aria-live="polite">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive(selectedNode.id) ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
              <Info size={17} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-900">{selectedNode.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isActive(selectedNode.id) ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>{isActive(selectedNode.id) ? "Active now" : "Not active yet"}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{selectedNode.description}</p>
              <p className="mt-2 text-[11px] font-medium leading-5 text-blue-700">Memory hook: {selectedNode.learnerTip}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Participant({ id, title, subtitle, icon: Icon, active, selected, onSelect }: { id: string; title: string; subtitle: string; icon: LucideIcon; active: boolean; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(id)} data-map-node={id} className={`rounded-[1.75rem] border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${active ? "border-emerald-300 bg-emerald-50 shadow-[0_14px_36px_rgba(16,185,129,.10)]" : selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${active ? "border-emerald-200 bg-white text-emerald-700" : selected ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
    </button>
  );
}

function RouteConnector({ active, reverse, label, nodeActive, nodeId, selected, onSelect }: { active: boolean; reverse: boolean; label: string; nodeActive: boolean; nodeId: string; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-row items-center gap-2 md:flex-col md:gap-1.5">
      <button type="button" onClick={() => onSelect(nodeId)} data-map-node={nodeId} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${nodeActive ? "border-blue-200 bg-blue-50 text-blue-700" : selected ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200"}`}>
        <Link2 size={12} strokeWidth={2} aria-hidden="true" />
        {label}
      </button>
      <div className="relative h-px flex-1 overflow-visible bg-slate-200 md:h-10 md:w-px md:flex-none">
        {active && <div className="absolute inset-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.30)]" />}
        {active && <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)] md:left-1/2 md:top-auto md:-translate-x-1/2 md:translate-y-0 ${reverse ? "right-0 md:bottom-0" : "left-0 md:top-0"}`} />}
      </div>
    </div>
  );
}

function ServiceNode({ service, active, selected, onSelect }: { service: (typeof services)[number]; active: boolean; selected: boolean; onSelect: (id: string) => void }) {
  const Icon = service.icon;
  return (
    <button type="button" onClick={() => onSelect(service.id)} data-map-node={service.id} className={`rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${active ? "border-blue-200 bg-blue-50 text-slate-900 shadow-[0_8px_20px_rgba(37,99,235,.08)]" : selected ? "border-blue-300 bg-blue-50 text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${active || selected ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 text-slate-500"}`}>
          <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">{service.label}</p>
          <p className="mt-0.5 truncate text-[9px] text-slate-500">{service.hint}</p>
        </div>
      </div>
    </button>
  );
}
