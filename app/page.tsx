import Link from "next/link";
import { LearnerNav } from "@/components/LearnerNav";

const journey = [
  ["01", "See the business problem", "Start with two companies and one useful data need. No architecture wall on day one."],
  ["02", "Run the exchange", "Watch identity, discovery, policy, semantics and transfer appear exactly when the story needs them."],
  ["03", "Change your depth", "Keep the same scenario while switching between Manager, Architect and Developer explanations."],
  ["04", "Break it on purpose", "Boss Fights make you diagnose failed exchanges instead of memorizing a happy-path diagram."],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen pb-20">
      <LearnerNav active="home" eyebrow="Learn Tractus-X by running it" />
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="grid min-h-[76vh] items-center gap-8 py-10 md:py-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/13 bg-emerald-300/[0.045] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/68"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.5)]" />Interactive dataspace simulator</div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-0.06em] md:text-7xl xl:text-[5.5rem]">Don’t read the dataspace. <span className="text-white/42">Run it.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/50 md:text-lg">TractusLab turns Tractus-X into business scenarios you can see, touch, break and fix—then reveals the architecture and technical behavior only when you want it.</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/path" className="rounded-xl bg-emerald-300 px-5 py-3.5 text-sm font-bold text-[#07110f] shadow-[0_14px_38px_rgba(110,231,183,.1)] transition hover:-translate-y-0.5 hover:bg-emerald-200">Start guided path →</Link>
              <Link href="/scenarios" className="rounded-xl border border-white/10 bg-white/[0.025] px-5 py-3.5 text-sm font-semibold text-white/62 transition hover:border-white/16 hover:bg-white/[0.04] hover:text-white/80">Explore scenarios</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white/27"><span>6 business simulations</span><span>3 learning depths</span><span>Boss Fight diagnostics</span><span>Progress & mastery</span></div>
          </div>

          <div className="surface-hero relative overflow-hidden p-4 md:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-300/[0.07] blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between"><div><p className="eyebrow">Live learning preview</p><p className="mt-1 text-xs text-white/28">Battery PCF · Manager view</p></div><span className="rounded-xl border border-white/8 bg-black/15 px-2.5 py-1 text-[10px] text-white/32">Step 2 / 7</span></div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
                <DemoCompany label="Supplier" detail="Owns carbon data" symbol="P" />
                <div className="text-center"><span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-white/22 sm:block">governed exchange</span><div className="mt-1 text-3xl text-emerald-300">↔</div></div>
                <DemoCompany label="Manufacturer" detail="Needs PCF data" symbol="C" />
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300/65">Now · Catalog discovery</p><span className="text-[10px] text-white/24">Business meaning</span></div>
                <p className="mt-3 text-lg font-semibold leading-7 tracking-[-0.02em]">What battery data can the manufacturer actually request?</p>
                <p className="mt-2 text-sm leading-6 text-white/38">First discover the offer. The actual carbon data does not move yet.</p>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {["Identity", "Catalog", "Policy", "Agreement", "Transfer"].map((item, index) => <div key={item} className={`rounded-xl border px-2 py-2 text-center text-[9px] font-semibold ${index === 0 ? "border-emerald-300/13 bg-emerald-300/[0.035] text-emerald-100/50" : index === 1 ? "border-cyan-300/20 bg-cyan-300/[0.055] text-cyan-100/68" : "border-white/6 text-white/20"}`}>{index === 0 ? "✓ " : ""}{item}</div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Learning model</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Business first. Architecture second. Technology last.</h2></div><Link href="/path" className="button-secondary">See the full path →</Link></div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {journey.map(([number, title, text]) => <div key={number} className="surface-card p-5"><span className="text-xs font-black text-emerald-300/65">{number}</span><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h3><p className="mt-2 text-sm leading-6 text-white/38">{text}</p></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoCompany({ label, detail, symbol }: { label: string; detail: string; symbol: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/14 p-3 text-center md:p-5"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/[0.035] text-xs font-black text-white/62">{symbol}</div><p className="mt-3 truncate text-sm font-semibold">{label}</p><p className="mt-1 text-[10px] text-white/27">{detail}</p></div>;
}
