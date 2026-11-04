/**
 * CSRF guard for the BFF's own mutation routes (login, logout, MFA). A browser
 * always sends an Origin (or at least a Referer) on these same-origin POSTs;
 * this compares it with the portal's own PUBLIC origin.
 *
 * Behind the reverse proxy `request.url`, `Host` and `X-Forwarded-*` do NOT
 * describe the public origin (Next.js standalone reports the bind address,
 * e.g. https://0.0.0.0:3000) and they are client-influenced, so in production
 * the reference is NOKI_PUBLIC_ORIGIN, an explicit operator setting. It is
 * validated strictly and the guard fails closed when it is absent or invalid.
 */

export const PUBLIC_ORIGIN_ENV = "NOKI_PUBLIC_ORIGIN";

/**
 * Returns the canonical origin for a strictly valid public origin value, or
 * null: https only, exact origin (no path, query, fragment, credentials or
 * trailing garbage), non-empty host, default port or an explicit numeric one.
 */
export function parsePublicOrigin(raw: string | undefined): string | null {
  if (raw === undefined || raw !== raw.trim() || raw === "") {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname === "") {
    return null;
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    return null;
  }
  if (url.pathname !== "/" || raw.includes("?") || raw.includes("#")) {
    return null;
  }
  // Only the bare origin (optionally with a trailing slash) is accepted: no other spelling.
  if (raw !== url.origin && raw !== `${url.origin}/`) {
    return null;
  }

  return url.origin;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  const configured = parsePublicOrigin(process.env[PUBLIC_ORIGIN_ENV]);

  if (isProduction() && configured === null) {
    // Missing or invalid public origin in production: refuse everything.
    return false;
  }

  // A browser that says the request is not same-origin is never trusted.
  if (secFetchSite !== undefined && secFetchSite !== "same-origin") {
    return isLocalDevelopmentPair(request, secFetchSite, configured);
  }

  const candidate = request.headers.get("origin") ?? request.headers.get("referer");

  if (configured !== null) {
    if (!candidate) {
      return secFetchSite === "same-origin";
    }
    return originOf(candidate) === configured;
  }

  // Local development / tests only (production returned above).
  const requestUrl = new URL(request.url);
  if (!candidate) {
    return secFetchSite === "same-origin";
  }
  const candidateOrigin = originOf(candidate);
  return candidateOrigin !== null && candidateOrigin === requestUrl.origin;
}

function originOf(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin === "null" ? null : url.origin;
  } catch {
    return null;
  }
}

/** localhost dev servers on different loopback spellings/ports (dev and tests only, never production). */
function isLocalDevelopmentPair(request: Request, secFetchSite: string, configured: string | null): boolean {
  if (isProduction() || configured !== null || secFetchSite !== "same-site") {
    return false;
  }
  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  const requestUrl = new URL(request.url);
  const candidateOrigin = candidate ? originOf(candidate) : null;
  if (!isLoopbackHost(requestUrl.hostname)) {
    return false;
  }
  if (candidateOrigin === null) {
    return true;
  }
  const candidateUrl = new URL(candidateOrigin);
  return (
    isLoopbackHost(candidateUrl.hostname) &&
    candidateUrl.protocol === requestUrl.protocol &&
    candidateUrl.port === requestUrl.port
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0";
}
