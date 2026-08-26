import type { FlowDirection } from "@/lib/simulator";

const nodes = [
  { id: "supplier", label: "Supplier", icon: "🏭", group: "company" },
  { id: "supplier-edc", label: "Provider EDC", icon: "◈", group: "connector" },
  { id: "identity", label: "Identity", icon: "✓", group: "service" },
  { id: "policy", label: "Policy", icon: "§", group: "service" },
  { id: "dataspace", label: "Dataspace", icon: "↔", group: "core" },
  { id: "dtr", label: "DTR", icon: "◎", group: "service" },
  { id: "semantic-model", label: "Semantics", icon: "{}", group: "service" },
  { id: "consumer-edc", label: "Consumer EDC", icon: "◈", group: "connector" },
  { id: "manufacturer", label: "Manufacturer", icon: "🚗", group: "company" },
  { id: "digital-twin", label: "Digital Twin", icon: "◇", group: "service" },
] as const;

export function DataspaceMap({ focus, direction }: { focus: string[]; direction: FlowDirection }) {
  const isActive = (id: string) => focus.includes(id);
  const arrow = direction === "supplier-to-manufacturer" ? "→" : direction === "manufacturer-to-supplier" ? "←" : direction === "both" ? "↔" : "·";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Dataspace map</p>
          <p className="mt-1 text-sm text-white/40">The highlighted pieces are active in this step.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-lg text-emerald-300">{arrow}</span>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        <MapNode node={nodes[0]} active={isActive(nodes[0].id)} />
        <Connector active={isActive("supplier-edc") || isActive("dataspace")} />
        <MapNode node={nodes[4]} active={isActive(nodes[4].id)} />
        <Connector active={isActive("consumer-edc") || isActive("dataspace")} />
        <MapNode node={nodes[8]} active={isActive(nodes[8].id)} />
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2">
        <div />
        <MapNode node={nodes[1]} active={isActive(nodes[1].id)} compact />
        <div />
        <MapNode node={nodes[7]} active={isActive(nodes[7].id)} compact />
        <div />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[nodes[2], nodes[3], nodes[5], nodes[6], nodes[9]].map((node) => (
          <MapNode key={node.id} node={node} active={isActive(node.id)} compact />
        ))}
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div className={`h-px w-full transition-all duration-500 ${active ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.45)]" : "bg-white/10"}`} />
    </div>
  );
}

function MapNode({ node, active, compact = false }: { node: (typeof nodes)[number]; active: boolean; compact?: boolean }) {
  return (
    <div
      data-map-node={node.id}
      className={`rounded-2xl border text-center transition-all duration-500 ${compact ? "p-2" : "p-3 md:p-4"} ${
        active
          ? "border-emerald-300/55 bg-emerald-300/12 text-white shadow-[0_0_0_1px_rgba(110,231,183,.05),0_10px_35px_rgba(5,46,37,.35)]"
          : "border-white/8 bg-black/15 text-white/35"
      }`}
    >
      <div className={compact ? "text-base" : "text-xl md:text-2xl"}>{node.icon}</div>
      <div className={`mt-1 font-medium ${compact ? "text-[10px] md:text-xs" : "text-[10px] md:text-sm"}`}>{node.label}</div>
    </div>
  );
}
