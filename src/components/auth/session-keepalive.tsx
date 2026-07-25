"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

/** Shorter than noki-api's default 900s (15 min) access token TTL. */
const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Periodically pings the BFF session route so that, as long as the tab
 * stays open, the access token is silently rotated via the backend-proven
 * refresh flow before it expires. If the session route reports the refresh
 * itself failed (401), sends the user back to login. Renders nothing.
 */
export function SessionKeepAlive() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!cancelled && response.status === 401) {
          router.replace("/login");
        }
      } catch {
        // A single failed keepalive ping should not force a redirect.
      }
    }

    const timer = setInterval(ping, KEEPALIVE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
