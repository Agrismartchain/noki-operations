import { afterEach, describe, expect, it, vi } from "vitest";

import { NokiApiConfigError, validateApiBaseUrl } from "./config";

describe("validateApiBaseUrl internal http hosts", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("still rejects http for the docker service name in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => validateApiBaseUrl("http://noki-api:3000")).toThrow(NokiApiConfigError);
  });

  it("accepts http only for a single-label host explicitly listed in NOKI_API_INTERNAL_HTTP_HOSTS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOKI_API_INTERNAL_HTTP_HOSTS", "noki-api");
    expect(validateApiBaseUrl("http://noki-api:3000")).toBe("http://noki-api:3000");
    expect(() => validateApiBaseUrl("http://other-api:3000")).toThrow(NokiApiConfigError);
  });

  it("never trusts a dotted hostname even if listed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOKI_API_INTERNAL_HTTP_HOSTS", "api.example.test");
    expect(() => validateApiBaseUrl("http://api.example.test")).toThrow(NokiApiConfigError);
  });
});
