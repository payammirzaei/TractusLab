import Link from "next/link";
import {
  ArrowLeftRight,
  BookOpenCheck,
  BrainCircuit,
  CarFront,
  CheckCircle2,
  Factory,
  Play,
  Search,
} from "lucide-react";
import { LearnerNav } from "@/components/LearnerNav";

const journey = [
  ["01", "See the business problem", "Start with two companies and one useful data need. No architecture wall on day one."],
  ["02", "Run the exchange", "Watch identity, discovery, policy, semantics and transfer appear exactly when the story needs them."],
  ["03", "Practice decisions", "Choose components, order workflows and solve architecture questions instead of only reading."],
  ["04", "Validate understanding", "Wrong answers explain what breaks, then Boss Fights turn the mental model into troubleshooting skill."],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen pb-20">
      <LearnerNav active="home" eyebrow="Learn Tractus-X by running it" />
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="grid min-h-[76vh] items-center gap-8 py-10 md:py-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Interactive dataspace learning lab</div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-0.06em] md:text-7xl xl:text-[5.5rem]">Don’t read the dataspace. <span className="text-blue-700 dark:text-blue-300">Run it.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">TractusLab turns Tractus-X into business scenarios you can see, touch, break and fix—then reveals the architecture and technical behavior only when you want it.</p>

            <div className="mt-6 grid max-w-3xl gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-200"><Search size={17} /><span className="text-xs font-bold uppercase tracking-[0.12em]">TractusMind</span></div>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Find & Understand</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Find the right knowledge, ask deeper questions and ground explanations in sources.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200"><BookOpenCheck size={17} /><span className="text-xs font-bold uppercase tracking-[0.12em]">TractusLab</span></div>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Learn & Practice</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Turn concepts into decisions, consequences, challenges and measurable progress.</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Knowledge → Understanding → Learning → Adoption</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">From complex documentation to confident adoption.</p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/path" className="rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700">Start guided path →</Link>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"><Play size={16} />Open demo mode</Link>
              <Link href="/scenarios" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">Explore scenarios</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400"><span>6 business simulations</span><span>3 learning depths</span><span>5 challenge types</span><span>Progress & mastery</span></div>
          </div>

          <div className="surface-hero relative overflow-hidden p-4 md:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-300/[0.12] blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between"><div><p className="eyebrow">Live learning preview</p><p className="mt-1 text-xs text-slate-400">Battery PCF · Manager view</p></div><span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">Step 2 / 7</span></div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
                <DemoCompany label="Supplier" detail="Owns carbon data" icon="factory" />
                <div className="text-center"><span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:block">governed exchange</span><ArrowLeftRight className="mx-auto mt-2 text-blue-600 dark:text-blue-300" size={28} /></div>
                <DemoCompany label="Manufacturer" detail="Needs PCF data" icon="car" />
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-400/15 dark:bg-blue-400/[0.07]">
                <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Now · Catalog discovery</p><span className="text-[10px] text-slate-400">Business meaning</span></div>
                <p className="mt-3 text-lg font-semibold leading-7 tracking-[-0.02em]">What battery data can the manufacturer actually request?</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">First discover the offer. The actual carbon data does not move yet.</p>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {["Identity", "Catalog", "Policy", "Agreement", "Transfer"].map((item, index) => <div key={item} className={`rounded-xl border px-2 py-2 text-center text-[9px] font-semibold ${index === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200" : index === 1 ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200" : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5"}`}><span className="inline-flex items-center justify-center gap-1">{index === 0 && <CheckCircle2 size={11} />}{item}</span></div>)}
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200"><BrainCircuit size={19} /></span>
                <div><p className="text-xs font-bold text-slate-800 dark:text-white">Need a deeper explanation?</p><p className="mt-0.5 text-[11px] text-slate-400">Hand the exact lesson context to TractusMind.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 py-12 dark:border-white/10 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Learning model</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Business first. Architecture second. Technology last.</h2></div><Link href="/path" className="button-secondary">See the full path →</Link></div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {journey.map(([number, title, text], index) => <div key={number} className="surface-card p-5"><span className={`text-xs font-black ${index % 2 === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-blue-700 dark:text-blue-300"}`}>{number}</span><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoCompany({ label, detail, icon }: { label: string; detail: string; icon: "factory" | "car" }) {
  const Icon = icon === "factory" ? Factory : CarFront;
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5 md:p-5"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"><Icon size={19} /></div><p className="mt-3 truncate text-sm font-semibold">{label}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div>;
}
