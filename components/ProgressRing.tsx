export function ProgressRing({ value, label, size = "md" }: { value: number; label?: string; size?: "sm" | "md" | "lg" }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const dimensions = size === "sm" ? "h-20 w-20" : size === "lg" ? "h-36 w-36" : "h-28 w-28";

  return (
    <div className={`relative ${dimensions} shrink-0`} role="img" aria-label={`${label ?? "Progress"}: ${clamped}%`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/[0.07]" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="text-emerald-300 transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`${size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl"} font-semibold tracking-[-0.04em] text-white`}>{clamped}%</div>
          {label && <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">{label}</div>}
        </div>
      </div>
    </div>
  );
}
