import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, applyAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { readAcceptLanguage } from "@/lib/auth/http";
import { resolveSession } from "@/lib/auth/session";

/**
 * BFF session read: the only place that reports the current actor to the
 * browser, and the only place that performs the (single, backend-proven)
 * refresh attempt -- Route Handlers can set cookies, Server Components
 * cannot, so this is where a rotated token pair actually gets persisted.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();
  const cookieStore = await cookies();

  const result = await resolveSession({
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
    locale: readAcceptLanguage(request),
    correlationId,
    allowRefresh: true,
  });

  if (result.status === "unauthenticated") {
    const response = NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  if (result.status === "forbidden") {
    const response = NextResponse.json({ status: "forbidden" }, { status: 403 });
    if (result.rotatedTokens) {
      applyAuthCookies(response, result.rotatedTokens);
    }
    return response;
  }

  const response = NextResponse.json({ status: "authenticated", actor: result.actor });
  if (result.rotatedTokens) {
    applyAuthCookies(response, result.rotatedTokens);
  }
  return response;
}
