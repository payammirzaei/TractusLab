"use client";

import { useEffect, useState } from "react";

type NetworkState = "online" | "offline" | "restored";

export function NetworkStatus() {
  const [state, setState] = useState<NetworkState>("online");

  useEffect(() => {
    if (!navigator.onLine) setState("offline");

    let restoredTimer: ReturnType<typeof setTimeout> | null = null;
    const goOffline = () => {
      if (restoredTimer) clearTimeout(restoredTimer);
      setState("offline");
    };
    const goOnline = () => {
      setState("restored");
      if (restoredTimer) clearTimeout(restoredTimer);
      restoredTimer = setTimeout(() => setState("online"), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (restoredTimer) clearTimeout(restoredTimer);
    };
  }, []);

  if (state === "online") return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 print:hidden" role="status" aria-live="polite">
      <div className={`rounded-2xl border px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-xl ${state === "offline" ? "border-amber-300/20 bg-[#17130a]/95 text-amber-100" : "border-emerald-300/20 bg-[#0b1714]/95 text-emerald-100"}`}>
        <span className={`mr-2 inline-block h-2 w-2 rounded-full ${state === "offline" ? "bg-amber-300" : "bg-emerald-300"}`} />
        {state === "offline" ? "Offline — local learning still works" : "Back online — server sync can resume"}
      </div>
    </div>
  );
}
