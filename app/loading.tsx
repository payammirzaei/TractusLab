export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl skeleton-card" />
          <div>
            <div className="h-3 w-28 rounded-full skeleton-card" />
            <div className="mt-2 h-2.5 w-44 rounded-full skeleton-card" />
          </div>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="surface-panel p-6 md:p-8">
            <div className="h-3 w-24 rounded-full skeleton-card" />
            <div className="mt-5 h-12 w-4/5 rounded-2xl skeleton-card" />
            <div className="mt-4 h-4 w-full rounded-full skeleton-card" />
            <div className="mt-2 h-4 w-3/4 rounded-full skeleton-card" />
            <div className="mt-8 h-11 w-36 rounded-xl skeleton-card" />
          </div>
          <div className="surface-panel p-6 md:p-8">
            <div className="h-3 w-32 rounded-full skeleton-card" />
            <div className="mt-6 h-28 rounded-2xl skeleton-card" />
            <div className="mt-3 h-28 rounded-2xl skeleton-card" />
          </div>
        </div>
        <p className="sr-only">Loading TractusLab…</p>
      </div>
    </main>
  );
}
