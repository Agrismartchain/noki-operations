import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logoutWithBackend } from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE, clearAuthCookies } from "@/lib/auth/cookies";
import { jsonError, readAcceptLanguage } from "@/lib/auth/http";
import { isSameOriginRequest } from "@/lib/auth/origin";

/**
 * BFF logout: best-effort revocation on the backend, but cookies are always
 * cleared locally regardless of whether that call succeeds -- a user must
 * always be able to sign out of noki-operations even if noki-api is unreachable.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();

  if (!isSameOriginRequest(request)) {
    return jsonError(403, "INVALID_ORIGIN", correlationId);
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      await logoutWithBackend(accessToken, {
        locale: readAcceptLanguage(request),
        correlationId,
      });
    } catch {
      // Best-effort: backend unreachable or session already invalid.
      // Cookies are cleared unconditionally below.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
