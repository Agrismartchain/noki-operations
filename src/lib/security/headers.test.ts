import { afterEach, describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "./headers";

const byKey = (headers: ReturnType<typeof buildSecurityHeaders>) => Object.fromEntries(headers.map((h) => [h.key, h.value]));
const ORIGINAL_ENV = process.env.NODE_ENV;

afterEach(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_ENV;
});

describe("buildSecurityHeaders", () => {
  it("sets the full baseline in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const headers = byKey(buildSecurityHeaders());
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(headers["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(headers["Content-Security-Policy"]).not.toMatch(/connect-src[^;]*\bws:/);
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
  });

  it("allows eval and websockets only outside production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const csp = byKey(buildSecurityHeaders())["Content-Security-Policy"];
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("appends declared image and connect sources and supports indexable sites", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const headers = byKey(
      buildSecurityHeaders({ imgSrc: ["https:"], connectSrc: ["https://nominatim.openstreetmap.org"], indexable: true }),
    );
    expect(headers["Content-Security-Policy"]).toContain("img-src 'self' data: blob: https:");
    expect(headers["Content-Security-Policy"]).toContain("connect-src 'self' https://nominatim.openstreetmap.org");
    expect(headers["X-Robots-Tag"]).toBeUndefined();
  });
});
