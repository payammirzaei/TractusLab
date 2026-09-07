"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const VISITOR_ID_KEY = "tractuslab-visitor-id-v1";

function getVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_KEY, id);
  return id;
}

function getReferrerHost(): string | null {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname || null;
  } catch {
    return null;
  }
}

export function VisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!API_URL || !pathname) return;

    const payload = {
      visitor_id: getVisitorId(),
      path: pathname,
      referrer_host: getReferrerHost(),
      language: navigator.language || null,
    };

    fetch(`${API_URL}/v1/analytics/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Analytics must never affect the learning experience.
    });

  }, [pathname]);

  return null;
}
