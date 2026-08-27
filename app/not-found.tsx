import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="surface-hero w-full max-w-2xl p-7 text-center md:p-10">
        <p className="eyebrow">404 · Route not found</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">That lab route doesn’t exist.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/42">The scenario may have moved, been archived, or the link may be incomplete. Nothing in your learning progress was changed.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/path" className="button-primary">Open mission path</Link>
          <Link href="/scenarios" className="button-ghost">Browse scenarios</Link>
        </div>
      </section>
    </main>
  );
}
