import { NextResponse } from "next/server";

import { startMfaChallengeEnrollmentWithBackend } from "@/lib/auth/backend";
import { mapMfaErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isRouteContext, prepareMfaRoute } from "@/lib/auth/mfa-route";

/** BFF: starts two-factor setup. The secret is shown to its owner here, once, and is never stored by the portal. */
export async function POST(request: Request): Promise<NextResponse> {
  const prepared = await prepareMfaRoute(request, "challenge", { withBody: false });
  if (!isRouteContext(prepared)) return prepared;

  try {
    const start = await startMfaChallengeEnrollmentWithBackend(prepared.challengeToken as string, {
      locale: readAcceptLanguage(request),
      correlationId: prepared.correlationId,
    });
    return NextResponse.json(
      { secretBase32: start.secretBase32, otpauthUri: start.otpauthUri, issuer: start.issuer },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return mapMfaErrorToResponse(error, prepared.correlationId);
  }
}
