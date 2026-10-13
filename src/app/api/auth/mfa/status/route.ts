import { NextResponse } from "next/server";

import { fetchMfaStatusWithBackend } from "@/lib/auth/backend";
import { mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";

/** BFF: safe, secret-free two-factor state of the signed-in account. */
export async function GET(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "session", { withBody: false });
  if (!isRouteContext(prepared)) return prepared;

  try {
    const status = await fetchMfaStatusWithBackend(prepared.accessToken as string, {
      locale: readAcceptLanguage(request),
      correlationId: prepared.correlationId,
    });
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
