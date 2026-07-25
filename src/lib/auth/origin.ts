/**
 * Same-origin check for the BFF's own mutation routes (login, logout). This
 * is not a general CSRF library: it compares the Origin (falling back to
 * Referer) header against the request's own URL, which is enough for a
 * same-origin BFF that never needs to accept cross-site form posts.
 */
export function isSameOriginRequest(request: Request): boolean {
  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (!candidate) {
    return secFetchSite === "same-origin" || isSameSiteLocalRequest(requestUrl, secFetchSite);
  }

  let candidateUrl: URL;
  try {
    candidateUrl = new URL(candidate);
  } catch {
    return false;
  }

  return candidateUrl.origin === requestOrigin || isSameSiteLocalPair(requestUrl, candidateUrl, secFetchSite);
}

function isSameSiteLocalRequest(requestUrl: URL, secFetchSite: string | undefined): boolean {
  return secFetchSite === "same-site" && isLoopbackHost(requestUrl.hostname);
}

function isSameSiteLocalPair(requestUrl: URL, candidateUrl: URL, secFetchSite: string | undefined): boolean {
  if (secFetchSite !== "same-origin" && !isSameSiteLocalRequest(requestUrl, secFetchSite)) {
    return false;
  }

  if (!isLoopbackHost(requestUrl.hostname) || !isLoopbackHost(candidateUrl.hostname)) {
    return false;
  }

  return candidateUrl.protocol === requestUrl.protocol && candidateUrl.port === requestUrl.port;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0";
}
