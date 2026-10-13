import { NextResponse } from "next/server";

import { verifyMfaChallengeWithBackend } from "@/lib/auth/backend";
import { applyAuthCookies, clearMfaChallengeCookie } from "@/lib/auth/cookies";
import { jsonError, mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";
import { parseMfaProofBody } from "@/lib/auth/request-body";

/** BFF: completes sign-in with an authenticator or recovery code. Tokens go to httpOnly cookies, never to the page. */
export async function POST(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "challenge");
  if (!isRouteContext(prepared)) return prepared;

  const proof = parseMfaProofBody(prepared.body);
  if (!proof) return jsonError(400, "INVALID_BODY", prepared.correlationId);

  try {
    const tokens = await verifyMfaChallengeWithBackend(
      { challengeToken: prepared.challengeToken as string, ...proof },
      { locale: readAcceptLanguage(request), correlationId: prepared.correlationId },
    );
    const response = NextResponse.json({ ok: true });
    applyAuthCookies(response, tokens);
    clearMfaChallengeCookie(response);
    return response;
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
