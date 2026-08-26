import Link from "next/link";

const journey = [
  ["1", "Start with the business problem", "No protocol names. Just two companies that need to exchange useful data."],
  ["2", "Follow the guided missions", "Concepts unlock in a deliberate order, while useful branches open when the foundation is strong enough."],
  ["3", "Choose your depth", "Manager, Architect and Developer views explain the same moment at different technical depths."],
  ["4", "Prove it in Boss Fights", "Failure diagnosis earns competencies, achievements and clears the final mastery gate."],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="text-lg font-semibold tracking-tight">TractusLab</div>
        <div className="flex items-center gap-2">
          <Link href="/account" className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 hover:text-white/80">Account</Link>
          <Link href="/profile" className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 hover:text-white/80">Profile</Link>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1 text-xs text-emerald-100/70">Tractus-X, without the black box</span>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Interactive simulator</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.01] tracking-[-0.055em] md:text-7xl">Understand the dataspace before you learn the stack.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60">A manager should understand why Tractus-X exists. An architect should see how its pieces connect. A developer should be able to inspect the technical flow. Same story, different depth.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/path" className="rounded-full bg-emerald-300 px-6 py-3 font-semibold text-[#07110f] transition hover:translate-y-[-1px]">Start guided path →</Link>
            <Link href="/scenarios" className="rounded-full border border-white/15 px-6 py-3 font-medium text-white/75">Explore all simulations</Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-2 text-xs text-white/38">
            {['Guided missions', 'Battery PCF / CO₂', 'Digital Twin', 'Traceability', 'Demand & Capacity', 'Quality', 'Circular Economy', 'Achievements', 'Boss Fight mastery'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5">{item}</span>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 md:p-7">
          <div className="flex items-center justify-between text-xs text-white/40"><span>Mission 01</span><span>Battery PCF</span></div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Company title="Supplier" icon="🏭" subtitle="Owns PCF data" />
            <div className="text-center text-emerald-300"><div className="text-xs text-white/35">governed exchange</div><div className="mt-2 text-4xl">↔</div></div>
            <Company title="Manufacturer" icon="🚗" subtitle="Needs PCF data" />
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2 text-center text-[10px] text-white/48 md:text-xs">
            {['Identity', 'Catalog', 'Semantics', 'Policy', 'Transfer'].map((item, index) => (
              <div key={item} className={`rounded-xl border p-2 ${index < 2 ? 'border-emerald-300/30 bg-emerald-300/[0.08]' : 'border-white/8'}`}>{item}</div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-white/30">Current question</p><p className="mt-2 text-lg font-medium">“Who is asking for this battery data?”</p></div>
        </div>
      </section>

      <section id="journey" className="mx-auto max-w-7xl border-t border-white/10 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Learning model</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Business first. Architecture second. Technology last.</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {journey.map(([number, title, text]) => (
            <div key={number} className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"><div className="text-sm font-semibold text-emerald-300">{number}</div><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{text}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Company({ title, icon, subtitle }: { title: string; icon: string; subtitle: string }) {
  return <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-center md:p-5"><div className="text-4xl">{icon}</div><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-white/38">{subtitle}</p></div>;
}
