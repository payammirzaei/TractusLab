import Link from "next/link";
import { LearnerNav } from "@/components/LearnerNav";

export default function NotFound() {
  return (
    <main className="min-h-screen pb-16">
      <LearnerNav eyebrow="Route not found" />
      <div className="mx-auto grid min-h-[68vh] max-w-[1440px] place-items-center px-4 py-12 md:px-8">
        <section className="surface-hero w-full max-w-2xl p-6 text-center md:p-10">
          <p className="eyebrow">404 · Unknown route</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">That part of the lab does not exist.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/45">
            The scenario may have moved, or the address may be incomplete. Continue from the guided path or browse the scenario hub.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Link className="button-primary" href="/path">Guided path</Link>
            <Link className="button-secondary" href="/scenarios">Scenario hub</Link>
            <Link className="button-ghost" href="/">Home</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
