export type SecurityHeader = { key: string; value: string };

export type SecurityHeaderOptions = {
  /** Extra img-src sources (self, data: and blob: are always allowed). */
  imgSrc?: string[];
  /** Extra connect-src sources (self is always allowed). */
  connectSrc?: string[];
  /** Public marketing sites are indexable; every private portal sends noindex. */
  indexable?: boolean;
};

/**
 * Baseline security headers for a NOKI Next.js app, kept identical across the
 * portals so the policy can be reviewed once.
 *
 * script-src keeps 'unsafe-inline' because the App Router's own bootstrap /
 * RSC streaming scripts are inline and a per-request nonce would force every
 * page dynamic (Next.js "CSP without nonces"). 'unsafe-eval' is added only in
 * development for React refresh. All data flows through same-origin BFF
 * routes, so connect-src is 'self' unless a portal declares more. HSTS is
 * honoured by browsers only over HTTPS, so it is harmless on local HTTP.
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions = {}): SecurityHeader[] {
  const production = process.env.NODE_ENV === "production";
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", "data:", "blob:", ...(options.imgSrc ?? [])].join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${["'self'", ...(options.connectSrc ?? []), ...(production ? [] : ["ws:", "wss:"])].join(" ")}`,
  ];
  if (production) {
    directives.push("upgrade-insecure-requests");
  }

  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: directives.join("; ") },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (!options.indexable) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  }

  return headers;
}
