import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-12">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="text-lg font-semibold tracking-tight">TractusLab</div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1 text-xs text-emerald-100/70">
          Interactive Tractus-X learning
        </span>
      </nav>

      <section className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-14 py-16 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Learn by doing</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-7xl">
            Tractus-X should not feel like a black box.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/62">
            Start with a simple business story. See why each dataspace concept exists, watch the exchange happen, and only go technical when you want to.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/learn" className="rounded-full bg-emerald-300 px-6 py-3 font-semibold text-[#07110f] transition hover:scale-[1.02]">
              Start with a battery →
            </Link>
            <a href="#idea" className="rounded-full border border-white/15 px-6 py-3 font-medium text-white/80">
              How it works
            </a>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20">
          <div className="mb-8 flex items-center justify-between text-xs text-white/45">
            <span>BAT-12345</span>
            <span>Product Carbon Footprint</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Company title="Supplier A" icon="🏭" subtitle="Has battery CO₂ data" />
            <div className="flex flex-col items-center gap-2 text-emerald-300">
              <span className="text-xs text-white/45">controlled exchange</span>
              <span className="text-4xl">→</span>
            </div>
            <Company title="Manufacturer" icon="🚗" subtitle="Needs the data" />
          </div>
          <div className="mt-7 rounded-2xl bg-black/20 p-5">
            <p className="text-sm text-white/50">The question</p>
            <p className="mt-2 text-xl font-medium">“Can I get the carbon footprint of this battery?”</p>
          </div>
        </div>
      </section>

      <section id="idea" className="mx-auto max-w-6xl border-t border-white/10 py-14">
        <p className="max-w-3xl text-2xl leading-10 text-white/75">
          No acronyms first. We begin with <strong className="text-white">who, what, why and permission</strong> — then reveal Identity, Catalog, Policy, Contract and Transfer as the learner needs them.
        </p>
      </section>
    </main>
  );
}

function Company({ title, icon, subtitle }: { title: string; icon: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
      <div className="text-4xl">{icon}</div>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-white/45">{subtitle}</p>
    </div>
  );
}
