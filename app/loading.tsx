export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading TractusLab">
      <div className="skeleton-card h-14 rounded-2xl" />
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="skeleton-card h-72 rounded-[2rem]" />
        <div className="skeleton-card h-72 rounded-[2rem]" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="skeleton-card h-40 rounded-[1.75rem]" />)}
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
