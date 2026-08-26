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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018))] p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-16 top-[46%] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.75)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Live dataspace</p>
          </div>
          <p className="mt-2 text-sm text-white/42">Follow the highlighted responsibility instead of memorizing the whole architecture.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
          <span className={`text-lg ${routeActive ? "text-emerald-300" : "text-white/30"}`}>{arrow}</span>
          <span className="text-[11px] font-medium text-white/50">{directionText}</span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center">
        <Participant
          id="supplier"
          title="Data Provider"
          subtitle="Owns the source data"
          icon="🏭"
          active={isActive("supplier")}
        />

        <RouteConnector active={isActive("supplier-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Provider EDC" nodeActive={isActive("supplier-edc")} nodeId="supplier-edc" />

        <div data-map-node="dataspace" className={`relative rounded-[1.75rem] border p-5 text-center transition-all duration-500 ${isActive("dataspace") ? "border-emerald-300/45 bg-emerald-300/[0.09] shadow-[0_18px_60px_rgba(5,65,48,.25)]" : "border-white/10 bg-black/20"}`}>
          {isActive("dataspace") && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.75)]" />}
          <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border text-xl ${isActive("dataspace") ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/30"}`}>↔</div>
          <p className={`mt-3 text-sm font-semibold ${isActive("dataspace") ? "text-white" : "text-white/55"}`}>Governed exchange</p>
          <p className="mt-1 text-[11px] leading-5 text-white/30">No shared central database. Each participant keeps control.</p>
        </div>

        <RouteConnector active={isActive("consumer-edc") || isActive("dataspace")} reverse={direction === "manufacturer-to-supplier"} label="Consumer EDC" nodeActive={isActive("consumer-edc")} nodeId="consumer-edc" />

        <Participant
          id="manufacturer"
          title="Data Consumer"
          subtitle="Needs trusted data"
          icon="🚗"
          active={isActive("manufacturer")}
        />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/15 p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Supporting responsibilities</p>
          <p className="text-[10px] text-white/22">They light up only when the story needs them</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {services.map((service) => (
            <ServiceNode key={service.id} service={service} active={isActive(service.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Participant({ id, title, subtitle, icon, active }: { id: string; title: string; subtitle: string; icon: string; active: boolean }) {
  return (
    <div data-map-node={id} className={`rounded-[1.75rem] border p-4 text-center transition-all duration-500 ${active ? "border-emerald-300/35 bg-emerald-300/[0.075] shadow-[0_14px_45px_rgba(5,46,37,.24)]" : "border-white/8 bg-black/15"}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl ${active ? "border-emerald-300/25 bg-emerald-300/10" : "border-white/8 bg-white/[0.025] grayscale opacity-55"}`}>{icon}</div>
      <p className={`mt-3 text-sm font-semibold ${active ? "text-white" : "text-white/50"}`}>{title}</p>
      <p className="mt-1 text-[11px] text-white/28">{subtitle}</p>
    </div>
  );
}

function RouteConnector({ active, reverse, label, nodeActive, nodeId }: { active: boolean; reverse: boolean; label: string; nodeActive: boolean; nodeId: string }) {
  return (
    <div className="flex flex-row items-center gap-2 md:flex-col md:gap-1.5">
      <div data-map-node={nodeId} className={`whitespace-nowrap rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition-all duration-500 ${nodeActive ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/8 bg-black/20 text-white/30"}`}>◈ {label}</div>
      <div className="relative h-px flex-1 overflow-visible bg-white/8 md:h-10 md:w-px md:flex-none">
        {active && <div className="absolute inset-0 bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.55)]" />}
        {active && <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-emerald-200 shadow-[0_0_12px_rgba(167,243,208,.8)] md:left-1/2 md:top-auto md:-translate-x-1/2 md:translate-y-0 ${reverse ? "right-0 md:bottom-0" : "left-0 md:top-0"}`} />}
      </div>
    </div>
  );
}

function ServiceNode({ service, active }: { service: (typeof services)[number]; active: boolean }) {
  return (
    <div data-map-node={service.id} className={`rounded-2xl border p-3 transition-all duration-500 ${active ? "border-cyan-300/30 bg-cyan-300/[0.075] text-white shadow-[0_8px_25px_rgba(8,47,73,.16)]" : "border-white/7 bg-white/[0.015] text-white/32"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs ${active ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-white/8 text-white/25"}`}>{service.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">{service.label}</p>
          <p className="mt-0.5 truncate text-[9px] text-white/25">{service.hint}</p>
        </div>
      </div>
    </div>
  );
}
