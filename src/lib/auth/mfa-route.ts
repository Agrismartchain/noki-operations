import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, MFA_CHALLENGE_COOKIE } from "./cookies";
import { jsonError } from "./http";
import { isSameOriginRequest } from "./origin";
import { MAX_MFA_BODY_BYTES, readBoundedBody } from "./request-body";

export interface MfaRouteContext {
  correlationId: string;
  body: unknown;
  challengeToken?: string;
  accessToken?: string;
}

/**
 * Shared guard for the MFA BFF routes: same-origin only, JSON only, bounded body, no secret ever echoed.
 * `needs` says which cookie the route requires: the pre-session challenge or an authenticated session.
 */
export async function prepareMfaRoute(
  request: Request,
  needs: "challenge" | "session",
  options: { withBody?: boolean } = {},
): Promise<MfaRouteContext | NextResponse> {
  const correlationId = randomUUID();
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "INVALID_ORIGIN", correlationId);
  }

  let body: unknown;
  if (options.withBody !== false) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonError(415, "UNSUPPORTED_MEDIA_TYPE", correlationId);
    }
    const text = await readBoundedBody(request, MAX_MFA_BODY_BYTES);
    if (text === null) {
      return jsonError(413, "PAYLOAD_TOO_LARGE", correlationId);
    }
    try {
      body = JSON.parse(text);
    } catch {
      return jsonError(400, "INVALID_BODY", correlationId);
    }
  }

  const store = await cookies();
  if (needs === "challenge") {
    const challengeToken = store.get(MFA_CHALLENGE_COOKIE)?.value;
    if (!challengeToken) {
      return jsonError(401, "MFA_CHALLENGE_EXPIRED", correlationId);
    }
    return { correlationId, body, challengeToken };
  }

  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return jsonError(401, "UNAUTHENTICATED", correlationId);
  }
  return { correlationId, body, accessToken };
}

export function isRouteContext(value: MfaRouteContext | NextResponse): value is MfaRouteContext {
  return "correlationId" in value && !("cookies" in value);
}
