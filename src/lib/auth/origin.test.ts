import { afterEach, describe, expect, it, vi } from "vitest";

import { isSameOriginRequest, parsePublicOrigin } from "./origin";

const PUBLIC = "https://operations.noki-services.com";

function post(headers: Record<string, string>, url = "https://0.0.0.0:3000/api/auth/login"): Request {
  return new Request(url, { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

function production(origin: string | null = PUBLIC) {
  vi.stubEnv("NODE_ENV", "production");
  if (origin === null) {
    vi.stubEnv("NOKI_PUBLIC_ORIGIN", "");
    delete process.env.NOKI_PUBLIC_ORIGIN;
  } else {
    vi.stubEnv("NOKI_PUBLIC_ORIGIN", origin);
  }
}

describe("parsePublicOrigin", () => {
  it.each([PUBLIC, `${PUBLIC}/`, "https://operations.noki-services.com:8443"])("accepts %s", (value) => {
    expect(parsePublicOrigin(value)).toBe(new URL(value).origin);
  });

  it.each([
    undefined,
    "",
    " https://operations.noki-services.com",
    "http://operations.noki-services.com",
    "https://operations.noki-services.com/path",
    "https://operations.noki-services.com/?a=1",
    "https://operations.noki-services.com#frag",
    "https://user:pw@operations.noki-services.com",
    "operations.noki-services.com",
    "https://",
    "//operations.noki-services.com",
    "https://operations.noki-services.com//",
  ])("rejects %s", (value) => {
    expect(parsePublicOrigin(value)).toBeNull();
  });
});

describe("isSameOriginRequest in production behind the reverse proxy", () => {
  it("accepts the exact public Origin even though request.url is the internal bind address", () => {
    production();
    expect(isSameOriginRequest(post({ origin: PUBLIC, host: "operations.noki-services.com", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(post({ origin: PUBLIC }))).toBe(true);
  });

  it("accepts a conforming Referer when Origin is absent", () => {
    production();
    expect(isSameOriginRequest(post({ referer: `${PUBLIC}/fr/login` }))).toBe(true);
  });

  it("accepts a request with neither header only when Sec-Fetch-Site is same-origin", () => {
    production();
    expect(isSameOriginRequest(post({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(post({}))).toBe(false);
  });

  it.each([
    ["external domain", { origin: "https://evil.example" }],
    ["http instead of https", { origin: "http://operations.noki-services.com" }],
    ["different subdomain", { origin: "https://admin.noki-services.com" }],
    ["look-alike prefix", { origin: "https://operations.noki-services.com.evil.example" }],
    ["look-alike suffix", { origin: "https://evil-operations.noki-services.com" }],
    ["other port", { origin: "https://operations.noki-services.com:8443" }],
    ["opaque null origin", { origin: "null" }],
    ["garbage origin", { origin: "not a url" }],
    ["external Referer", { referer: "https://evil.example/fr/login" }],
    ["bad Origin with good Referer", { origin: "https://evil.example", referer: `${PUBLIC}/fr/login` }],
    ["cross-site fetch metadata", { origin: PUBLIC, "sec-fetch-site": "cross-site" }],
    ["same-site fetch metadata", { origin: PUBLIC, "sec-fetch-site": "same-site" }],
    ["forged Host and forwarded headers alone", { host: "operations.noki-services.com", "x-forwarded-host": "operations.noki-services.com", "x-forwarded-proto": "https" }],
    ["forged Origin matching the bind address", { origin: "https://0.0.0.0:3000" }],
  ])("rejects %s", (_name, headers) => {
    production();
    expect(isSameOriginRequest(post(headers))).toBe(false);
  });

  it.each([null, "", "http://operations.noki-services.com", "https://operations.noki-services.com/x", "operations.noki-services.com"])(
    "fails closed when NOKI_PUBLIC_ORIGIN is %s",
    (value) => {
      production(value);
      expect(isSameOriginRequest(post({ origin: PUBLIC, "sec-fetch-site": "same-origin" }))).toBe(false);
    },
  );
});

describe("isSameOriginRequest in local development", () => {
  it("falls back to request.url for same-origin loopback requests", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NOKI_PUBLIC_ORIGIN;
    const url = "http://localhost:3000/api/auth/login";
    expect(isSameOriginRequest(post({ origin: "http://localhost:3000" }, url))).toBe(true);
    expect(isSameOriginRequest(post({ origin: "http://evil.example" }, url))).toBe(false);
    expect(isSameOriginRequest(post({ origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }, url))).toBe(false);
  });

  it("never opens the loopback shortcut in production", () => {
    production();
    expect(isSameOriginRequest(post({ origin: "http://localhost:3000", "sec-fetch-site": "same-site" }, "http://localhost:3000/api/auth/login"))).toBe(false);
  });
});
