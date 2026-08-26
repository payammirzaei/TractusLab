"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LearnerNavSection = "home" | "path" | "scenarios" | "learn" | "profile" | "account" | "author";

const items: Array<{ id: LearnerNavSection; href: string; label: string; short: string }> = [
  { id: "path", href: "/path", label: "Mission path", short: "Path" },
  { id: "scenarios", href: "/scenarios", label: "Scenarios", short: "Explore" },
  { id: "learn", href: "/learn", label: "Simulator", short: "Lab" },
  { id: "profile", href: "/profile", label: "Profile", short: "Profile" },
];

function sectionFromPath(pathname: string): LearnerNavSection | undefined {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/path")) return "path";
  if (pathname.startsWith("/scenarios")) return "scenarios";
  if (pathname.startsWith("/learn")) return "learn";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/author")) return "author";
  return undefined;
}

export function LearnerNav({ active, eyebrow }: { active?: LearnerNavSection; eyebrow?: string }) {
  const pathname = usePathname();
  const resolvedActive = active ?? sectionFromPath(pathname);

  return (
    <header className="learner-nav">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 rounded-xl outline-none">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-sm font-black text-emerald-200 shadow-[0_8px_28px_rgba(16,185,129,.08)]">T</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-[-0.02em] text-white">TractusLab</span><span className="hidden truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/28 sm:block">{eyebrow ?? "Interactive dataspace lab"}</span></span>
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center rounded-2xl border border-white/8 bg-black/20 p-1 md:flex">
          {items.map((item) => (
            <Link key={item.id} href={item.href} aria-current={resolvedActive === item.id ? "page" : undefined} className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${resolvedActive === item.id ? "bg-white/10 text-white shadow-sm" : "text-white/42 hover:bg-white/[0.04] hover:text-white/75"}`}>{item.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/account" aria-current={resolvedActive === "account" ? "page" : undefined} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${resolvedActive === "account" ? "border-emerald-300/18 bg-emerald-300/[0.07] text-emerald-100" : "border-white/9 bg-white/[0.025] text-white/48 hover:border-white/16 hover:text-white/80"}`}>Account</Link>
          <Link href="/author" aria-current={resolvedActive === "author" ? "page" : undefined} className={`hidden rounded-xl border px-3 py-2 text-xs font-medium transition lg:inline-flex ${resolvedActive === "author" ? "border-amber-300/18 bg-amber-300/[0.05] text-amber-100/75" : "border-white/8 text-white/30 hover:text-white/65"}`}>Authoring</Link>
        </div>
      </div>

      <nav aria-label="Mobile primary" className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/[0.055] px-3 py-2 md:hidden">
        {items.map((item) => <Link key={item.id} href={item.href} aria-current={resolvedActive === item.id ? "page" : undefined} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${resolvedActive === item.id ? "bg-emerald-300/10 text-emerald-100" : "text-white/38"}`}>{item.short}</Link>)}
      </nav>
    </header>
  );
}
