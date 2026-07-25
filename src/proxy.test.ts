import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

import proxy from "./proxy";

function makeRequest(pathname: string, options: { accessToken?: string } = {}): NextRequest {
  const request = new NextRequest(new URL(pathname, "https://operations.example.test"));
  if (options.accessToken) {
    request.cookies.set(ACCESS_TOKEN_COOKIE, options.accessToken);
  }
  return request;
}

function isRedirectToLogin(response: Response, locale: string): boolean {
  if (response.status < 300 || response.status >= 400) {
    return false;
  }
  const location = response.headers.get("location");
  return location !== null && new URL(location).pathname === `/${locale}/login`;
}

describe("proxy", () => {
  it("redirects an unauthenticated request for a protected page to login", () => {
    const response = proxy(makeRequest("/fr/inbound"));
    expect(isRedirectToLogin(response, "fr")).toBe(true);
  });

  it("does not redirect an unauthenticated request to the login page itself", () => {
    const response = proxy(makeRequest("/fr/login"));
    expect(isRedirectToLogin(response, "fr")).toBe(false);
  });

  it("does not treat a path merely prefixed by login as public", () => {
    const response = proxy(makeRequest("/fr/login-not-a-real-page"));
    expect(isRedirectToLogin(response, "fr")).toBe(true);
  });

  it("does not redirect an authenticated request for a protected page", () => {
    const response = proxy(makeRequest("/fr/inbound", { accessToken: "session-token" }));
    expect(isRedirectToLogin(response, "fr")).toBe(false);
  });
});
