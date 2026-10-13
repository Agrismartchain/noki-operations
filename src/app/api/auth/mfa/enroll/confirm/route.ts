import { NextResponse } from "next/server";

import { confirmMfaChallengeEnrollmentWithBackend } from "@/lib/auth/backend";
import { applyAuthCookies, clearMfaChallengeCookie } from "@/lib/auth/cookies";
import { jsonError, mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";
import { parseMfaCodeOnlyBody } from "@/lib/auth/request-body";

/** BFF: confirms setup with the first code. Recovery codes are returned once; the session goes to httpOnly cookies. */
export async function POST(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "challenge");
  if (!isRouteContext(prepared)) return prepared;

  const body = parseMfaCodeOnlyBody(prepared.body);
  if (!body) return jsonError(400, "INVALID_BODY", prepared.correlationId);

  try {
    const result = await confirmMfaChallengeEnrollmentWithBackend(
      { challengeToken: prepared.challengeToken as string, code: body.code },
      { locale: readAcceptLanguage(request), correlationId: prepared.correlationId },
    );
    const response = NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes }, { headers: { "Cache-Control": "no-store" } });
    applyAuthCookies(response, result);
    clearMfaChallengeCookie(response);
    return response;
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
