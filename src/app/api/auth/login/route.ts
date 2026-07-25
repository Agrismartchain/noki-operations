import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { loginWithBackend } from "@/lib/auth/backend";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { jsonError, mapLoginErrorToResponse, readAcceptLanguage } from "@/lib/auth/http";
import { isSameOriginRequest } from "@/lib/auth/origin";
import { MAX_LOGIN_BODY_BYTES, parseLoginBody, readBoundedBody } from "@/lib/auth/request-body";

/**
 * BFF login: the only route that ever sees the password. It calls the real
 * backend endpoint, then stores the returned tokens as httpOnly cookies --
 * the JSON response sent back to the browser never contains a token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const correlationId = randomUUID();

  if (!isSameOriginRequest(request)) {
    return jsonError(403, "INVALID_ORIGIN", correlationId);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError(415, "UNSUPPORTED_MEDIA_TYPE", correlationId);
  }

  const bodyText = await readBoundedBody(request, MAX_LOGIN_BODY_BYTES);
  if (bodyText === null) {
    return jsonError(413, "PAYLOAD_TOO_LARGE", correlationId);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    return jsonError(400, "INVALID_BODY", correlationId);
  }

  const credentials = parseLoginBody(parsedBody);
  if (!credentials) {
    return jsonError(400, "INVALID_BODY", correlationId);
  }

  try {
    const tokens = await loginWithBackend(credentials, {
      locale: readAcceptLanguage(request),
      correlationId,
    });

    const response = NextResponse.json({ ok: true });
    applyAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return mapLoginErrorToResponse(error, correlationId);
  }
}
