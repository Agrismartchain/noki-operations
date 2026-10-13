import { NextResponse } from "next/server";

import { regenerateRecoveryCodesWithBackend } from "@/lib/auth/backend";
import { jsonError, mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";
import { parseMfaCodeOnlyBody } from "@/lib/auth/request-body";

/** BFF: replaces all recovery codes (needs a fresh authenticator code). The new codes are shown once. */
export async function POST(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "session");
  if (!isRouteContext(prepared)) return prepared;

  const body = parseMfaCodeOnlyBody(prepared.body);
  if (!body) return jsonError(400, "INVALID_BODY", prepared.correlationId);

  try {
    const result = await regenerateRecoveryCodesWithBackend(prepared.accessToken as string, body, {
      locale: readAcceptLanguage(request),
      correlationId: prepared.correlationId,
    });
    return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
