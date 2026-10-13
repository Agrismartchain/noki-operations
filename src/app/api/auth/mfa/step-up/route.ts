import { NextResponse } from "next/server";

import { stepUpWithBackend } from "@/lib/auth/backend";
import { jsonError, mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";
import { parseMfaProofBody } from "@/lib/auth/request-body";

/** BFF: re-proves the second factor for the current session before a sensitive action (bounded window). */
export async function POST(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "session");
  if (!isRouteContext(prepared)) return prepared;

  const proof = parseMfaProofBody(prepared.body);
  if (!proof) return jsonError(400, "INVALID_BODY", prepared.correlationId);

  try {
    const result = await stepUpWithBackend(prepared.accessToken as string, proof, {
      locale: readAcceptLanguage(request),
      correlationId: prepared.correlationId,
    });
    return NextResponse.json({ ok: true, validForSeconds: result.validForSeconds });
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
