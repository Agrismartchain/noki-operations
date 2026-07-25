const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export class NokiApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NokiApiConfigError";
  }
}

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Validates a candidate NOKI API base URL and returns it normalized (no
 * trailing slash). Throws NokiApiConfigError on any violation. Never embeds
 * the offending raw value in the thrown message beyond what is already
 * public configuration (no credentials are ever accepted).
 */
export function validateApiBaseUrl(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) {
    throw new NokiApiConfigError("NOKI_API_BASE_URL must not be empty.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new NokiApiConfigError("NOKI_API_BASE_URL must be an absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new NokiApiConfigError("NOKI_API_BASE_URL must use the http or https protocol.");
  }

  if (url.username.length > 0 || url.password.length > 0) {
    throw new NokiApiConfigError("NOKI_API_BASE_URL must not contain credentials.");
  }

  const local = isLocalHostname(url.hostname);

  if (url.protocol === "http:" && !local && isProductionEnvironment()) {
    throw new NokiApiConfigError("NOKI_API_BASE_URL must use https in production.");
  }

  if (url.protocol === "http:" && !local && !isProductionEnvironment()) {
    throw new NokiApiConfigError(
      "NOKI_API_BASE_URL may only use http for a localhost address in development or test environments.",
    );
  }

  const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");

  if (/\/v1$/.test(normalizedPath)) {
    throw new NokiApiConfigError('NOKI_API_BASE_URL must not include a "/v1" suffix.');
  }

  return `${url.protocol}//${url.host}${normalizedPath}`;
}

/**
 * Reads and validates NOKI_API_BASE_URL from the server environment. This is
 * only evaluated lazily, at the moment an API call is actually attempted, so
 * that builds and pages that never call the API never require it.
 */
export function resolveApiBaseUrl(): string {
  const raw = process.env.NOKI_API_BASE_URL;

  if (raw === undefined || raw.trim().length === 0) {
    throw new NokiApiConfigError("NOKI_API_BASE_URL is not configured.");
  }

  return validateApiBaseUrl(raw);
}
