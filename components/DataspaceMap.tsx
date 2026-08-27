import type { FlowDirection } from "@/lib/simulator";

const services = [
  { id: "identity", label: "Identity", icon: "✓", hint: "Who are you?" },
  { id: "policy", label: "Policy", icon: "§", hint: "May I use it?" },
  { id: "dtr", label: "DTR", icon: "◎", hint: "Where is the twin?" },
  { id: "semantic-model", label: "Semantics", icon: "{}", hint: "What does it mean?" },
  { id: "digital-twin", label: "Digital Twin", icon: "◇", hint: "Which asset?" },
] as const;

export function DataspaceMap({ focus, direction }: { focus: string[]; direction: FlowDirection }) {
  const isActive = (id: string) => focus.includes(id);
  const routeActive = ["supplier", "supplier-edc", "dataspace", "consumer-edc", "manufacturer"].some(isActive);
  const directionText = direction === "supplier-to-manufacturer"
    ? "Provider → Consumer"
    : direction === "manufacturer-to-supplier"
      ? "Consumer → Provider"
      : direction === "both"
        ? "Two-way exchange"
        : "Inside one participant";
  const arrow = direction === "supplier-to-manufacturer" ? "→" : direction === "manufacturer-to-supplier" ? "←" : direction === "both" ? "↔" : "•";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,.10),transparent_45%),linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,250,.92))] p-5 shadow-sm md:p-6">
      <div className="pointer-events-none absolute inset-x-16 top-[46%] hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent md:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.28)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Live dataspace</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">Follow the highlighted responsibility instead of memorizing the whole architecture.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
          <span className={`text-lg ${routeActive ? "text-emerald-600" : "text-slate-400"}`}>{arrow}</span>
          <span className="text-[11px] font-medium text-slate-700">{directionText}</span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center">
        <Participant id="supplier" title="Data Provider" subtitle="Owns the source data" icon="🏭" active={isActive("supplier")} />
        <RouteConnector active={isActive("supplier-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Provider EDC" nodeActive={isActive("supplier-edc")} nodeId="supplier-edc" />

        <div data-map-node="dataspace" className={`relative rounded-[1.75rem] border p-5 text-center transition-all duration-500 ${isActive("dataspace") ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_45px_rgba(16,185,129,.10)]" : "border-slate-200 bg-white"}`}>
          {isActive("dataspace") && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.26)]" />}
          <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border text-xl ${isActive("dataspace") ? "border-emerald-200 bg-white text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>↔</div>
          <p className={`mt-3 text-sm font-semibold ${isActive("dataspace") ? "text-slate-900" : "text-slate-700"}`}>Governed exchange</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">No shared central database. Each participant keeps control.</p>
        </div>

        <RouteConnector active={isActive("consumer-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Consumer EDC" nodeActive={isActive("consumer-edc")} nodeId="consumer-edc" />
        <Participant id="manufacturer" title="Data Consumer" subtitle="Needs trusted data" icon="🚗" active={isActive("manufacturer")} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Supporting responsibilities</p>
          <p className="text-[10px] text-slate-500">They light up only when the story needs them</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {services.map((service) => <ServiceNode key={service.id} service={service} active={isActive(service.id)} />)}
        </div>
      </div>
    </section>
  );
}

function Participant({ id, title, subtitle, icon, active }: { id: string; title: string; subtitle: string; icon: string; active: boolean }) {
  return (
    <div data-map-node={id} className={`rounded-[1.75rem] border p-4 text-center transition-all duration-500 ${active ? "border-emerald-300 bg-emerald-50 shadow-[0_14px_36px_rgba(16,185,129,.10)]" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl ${active ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-50 grayscale opacity-70"}`}>{icon}</div>
      <p className={`mt-3 text-sm font-semibold ${active ? "text-slate-900" : "text-slate-700"}`}>{title}</p>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
    </div>
  );
}

function RouteConnector({ active, reverse, label, nodeActive, nodeId }: { active: boolean; reverse: boolean; label: string; nodeActive: boolean; nodeId: string }) {
  return (
    <div className="flex flex-row items-center gap-2 md:flex-col md:gap-1.5">
      <div data-map-node={nodeId} className={`whitespace-nowrap rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition-all duration-500 ${nodeActive ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"}`}>◈ {label}</div>
      <div className="relative h-px flex-1 overflow-visible bg-slate-200 md:h-10 md:w-px md:flex-none">
        {active && <div className="absolute inset-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.30)]" />}
        {active && <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)] md:left-1/2 md:top-auto md:-translate-x-1/2 md:translate-y-0 ${reverse ? "right-0 md:bottom-0" : "left-0 md:top-0"}`} />}
      </div>
    </div>
  );
}

function ServiceNode({ service, active }: { service: (typeof services)[number]; active: boolean }) {
  return (
    <div data-map-node={service.id} className={`rounded-2xl border p-3 transition-all duration-500 ${active ? "border-blue-200 bg-blue-50 text-slate-900 shadow-[0_8px_20px_rgba(37,99,235,.08)]" : "border-slate-200 bg-white text-slate-600"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs ${active ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 text-slate-500"}`}>{service.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">{service.label}</p>
          <p className="mt-0.5 truncate text-[9px] text-slate-500">{service.hint}</p>
        </div>
      </div>
    </div>
  );
}
