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
import { useI18n } from "@/components/I18nProvider";
import type { FlowDirection } from "@/lib/simulator";

type MapNode = {
  id: string;
  label: string;
  description: string;
  learnerTip: string;
};

type MapService = {
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export function DataspaceMap({ focus, direction }: { focus: string[]; direction: FlowDirection }) {
  const { t } = useI18n();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const isActive = (id: string) => focus.includes(id);

  const nodeDetails: MapNode[] = useMemo(() => [
    { id: "supplier", label: t("map.provider"), description: t("map.providerDescription"), learnerTip: t("map.providerTip") },
    { id: "supplier-edc", label: t("map.providerEdc"), description: t("map.providerEdcDescription"), learnerTip: t("map.providerEdcTip") },
    { id: "dataspace", label: t("map.exchange"), description: t("map.exchangeDescription"), learnerTip: t("map.exchangeTip") },
    { id: "consumer-edc", label: t("map.consumerEdc"), description: t("map.consumerEdcDescription"), learnerTip: t("map.consumerEdcTip") },
    { id: "manufacturer", label: t("map.consumer"), description: t("map.consumerDescription"), learnerTip: t("map.consumerTip") },
    { id: "identity", label: t("map.identity"), description: t("map.identityDescription"), learnerTip: t("map.identityTip") },
    { id: "policy", label: t("map.policy"), description: t("map.policyDescription"), learnerTip: t("map.policyTip") },
    { id: "dtr", label: t("map.dtr"), description: t("map.dtrDescription"), learnerTip: t("map.dtrTip") },
    { id: "semantic-model", label: t("map.semantics"), description: t("map.semanticsDescription"), learnerTip: t("map.semanticsTip") },
    { id: "digital-twin", label: t("map.digitalTwin"), description: t("map.digitalTwinDescription"), learnerTip: t("map.digitalTwinTip") },
  ], [t]);

  const services: MapService[] = useMemo(() => [
    { id: "identity", label: t("map.identity"), icon: CircleCheck, hint: t("map.who") },
    { id: "policy", label: t("map.policy"), icon: ShieldCheck, hint: t("map.mayUse") },
    { id: "dtr", label: "DTR", icon: Database, hint: t("map.whereTwin") },
    { id: "semantic-model", label: t("map.semantics"), icon: Braces, hint: t("map.whatMean") },
    { id: "digital-twin", label: t("map.digitalTwin"), icon: Box, hint: t("map.whichAsset") },
  ], [t]);

  const selectedNode = useMemo(() => nodeDetails.find((node) => node.id === selectedNodeId) ?? null, [nodeDetails, selectedNodeId]);
  const routeActive = ["supplier", "supplier-edc", "dataspace", "consumer-edc", "manufacturer"].some(isActive);
  const directionText = direction === "supplier-to-manufacturer"
    ? t("timeline.providerConsumer")
    : direction === "manufacturer-to-supplier"
      ? t("timeline.consumerProvider")
      : direction === "both"
        ? t("timeline.twoWayExchange")
        : t("map.insideParticipant");

  const DirectionIcon = direction === "supplier-to-manufacturer"
    ? ArrowRight
    : direction === "manufacturer-to-supplier"
      ? ArrowLeft
      : direction === "both"
        ? ArrowLeftRight
        : Minus;

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,.10),transparent_45%),linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,250,.92))] p-5 shadow-sm md:p-6">
      <div className="pointer-events-none absolute inset-x-16 top-[46%] hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent md:block" />

      <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.28)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{t("map.title")}</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">{t("map.intro")}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-blue-700">
            <MousePointerClick size={13} strokeWidth={2} aria-hidden="true" />
            {t("map.interactive")}
          </div>
        </div>
        <div className="flex max-w-full items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
          <DirectionIcon className={routeActive ? "shrink-0 text-emerald-600" : "shrink-0 text-slate-400"} size={17} strokeWidth={1.9} aria-hidden="true" />
          <span className="min-w-0 text-[11px] font-medium text-slate-700">{directionText}</span>
        </div>
      </div>

      <div className="relative mt-6 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_112px_minmax(0,1.15fr)_112px_minmax(0,1fr)] md:items-center">
        <Participant id="supplier" title={t("map.provider")} subtitle={t("map.providerSubtitle")} icon={Factory} active={isActive("supplier")} selected={selectedNodeId === "supplier"} onSelect={setSelectedNodeId} />
        <RouteConnector active={isActive("supplier-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label={t("map.providerEdc")} nodeActive={isActive("supplier-edc")} nodeId="supplier-edc" selected={selectedNodeId === "supplier-edc"} onSelect={setSelectedNodeId} />

        <button
          type="button"
          data-map-node="dataspace"
          onClick={() => setSelectedNodeId("dataspace")}
          className={`relative min-w-0 rounded-[1.75rem] border p-5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${isActive("dataspace") ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_45px_rgba(16,185,129,.10)]" : selectedNodeId === "dataspace" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
        >
          {isActive("dataspace") && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.26)]" />}
          <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border ${isActive("dataspace") ? "border-emerald-200 bg-white text-emerald-700" : selectedNodeId === "dataspace" ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <Network size={22} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="mt-3 break-words text-sm font-semibold leading-5 text-slate-900">{t("map.exchangeCard")}</p>
          <p className="mt-1 break-words text-[11px] leading-5 text-slate-500">{t("map.exchangeCardDetail")}</p>
        </button>

        <RouteConnector active={isActive("consumer-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label={t("map.consumerEdc")} nodeActive={isActive("consumer-edc")} nodeId="consumer-edc" selected={selectedNodeId === "consumer-edc"} onSelect={setSelectedNodeId} />
        <Participant id="manufacturer" title={t("map.consumer")} subtitle={t("map.consumerSubtitle")} icon={Car} active={isActive("manufacturer")} selected={selectedNodeId === "manufacturer"} onSelect={setSelectedNodeId} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t("map.supporting")}</p>
          <p className="text-[10px] text-slate-500">{t("map.inspect")}</p>
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
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isActive(selectedNode.id) ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>{isActive(selectedNode.id) ? t("map.activeNow") : t("map.notActive")}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{selectedNode.description}</p>
              <p className="mt-2 text-[11px] font-medium leading-5 text-blue-700">{t("map.memoryHook", { tip: selectedNode.learnerTip })}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Participant({ id, title, subtitle, icon: Icon, active, selected, onSelect }: { id: string; title: string; subtitle: string; icon: LucideIcon; active: boolean; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(id)} data-map-node={id} className={`w-full min-w-0 rounded-[1.75rem] border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${active ? "border-emerald-300 bg-emerald-50 shadow-[0_14px_36px_rgba(16,185,129,.10)]" : selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${active ? "border-emerald-200 bg-white text-emerald-700" : selected ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="mt-3 break-words text-sm font-semibold leading-5 text-slate-900">{title}</p>
      <p className="mt-1 break-words text-[11px] leading-4 text-slate-500">{subtitle}</p>
    </button>
  );
}

function RouteConnector({ active, reverse, label, nodeActive, nodeId, selected, onSelect }: { active: boolean; reverse: boolean; label: string; nodeActive: boolean; nodeId: string; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <div className="flex min-w-0 flex-row items-center gap-2 md:w-[112px] md:flex-col md:gap-1.5">
      <button type="button" onClick={() => onSelect(nodeId)} data-map-node={nodeId} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-[10px] font-semibold leading-4 transition-all duration-300 hover:-translate-y-0.5 md:w-full ${nodeActive ? "border-blue-200 bg-blue-50 text-blue-700" : selected ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200"}`}>
        <Link2 className="shrink-0" size={12} strokeWidth={2} aria-hidden="true" />
        <span className="min-w-0 break-words">{label}</span>
      </button>
      <div className="relative h-px flex-1 overflow-visible bg-slate-200 md:h-10 md:w-px md:flex-none">
        {active && <div className="absolute inset-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.30)]" />}
        {active && <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)] md:left-1/2 md:top-auto md:-translate-x-1/2 md:translate-y-0 ${reverse ? "right-0 md:bottom-0" : "left-0 md:top-0"}`} />}
      </div>
    </div>
  );
}

function ServiceNode({ service, active, selected, onSelect }: { service: MapService; active: boolean; selected: boolean; onSelect: (id: string) => void }) {
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
