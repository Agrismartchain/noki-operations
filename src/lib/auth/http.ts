import { NextResponse } from "next/server";

import { NokiApiConfigError } from "@/lib/api/config";
import { NokiApiError } from "@/lib/api/errors";

export function readAcceptLanguage(request: Request): string | undefined {
  return request.headers.get("accept-language") ?? undefined;
}

export interface SanitizedErrorBody {
  code: string;
  correlationId: string;
}

export function jsonError(status: number, code: string, correlationId: string): NextResponse {
  return NextResponse.json({ code, correlationId } satisfies SanitizedErrorBody, { status });
}

/**
 * Maps a login attempt failure to a sanitized response. Never forwards the
 * backend's raw message: only a technical `code` the login form can look up
 * a translated string for.
 */
export function mapLoginErrorToResponse(error: unknown, correlationId: string): NextResponse {
  if (error instanceof NokiApiConfigError) {
    return jsonError(503, "CONFIGURATION_ERROR", correlationId);
  }

  if (error instanceof NokiApiError) {
    switch (error.kind) {
      case "unauthorized":
        return jsonError(401, "INVALID_CREDENTIALS", correlationId);
      case "rate_limited":
        return jsonError(429, "RATE_LIMITED", correlationId);
      case "timeout":
        return jsonError(504, "TIMEOUT", correlationId);
      case "network":
        return jsonError(503, "SERVICE_UNAVAILABLE", correlationId);
      case "bad_request":
      case "unprocessable":
        return jsonError(400, "INVALID_REQUEST", correlationId);
      case "forbidden":
        return jsonError(403, "FORBIDDEN", correlationId);
      default:
        return jsonError(502, "UPSTREAM_ERROR", correlationId);
    }
  }

  return jsonError(500, "UNEXPECTED_ERROR", correlationId);
}
