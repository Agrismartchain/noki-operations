/**
 * Header name expected by noki-api's correlation id hook
 * (registerCorrelationIdHook, src/common/http/correlation-id.hook.ts). The
 * backend echoes back whatever value matches its validation pattern, or
 * generates its own otherwise.
 */
export const CORRELATION_ID_HEADER = "x-correlation-id";

/** Mirrors noki-api's own correlation id validation pattern. */
const CORRELATION_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

export function isValidCorrelationId(value: string): boolean {
  return CORRELATION_ID_PATTERN.test(value);
}

export interface BuildRequestHeadersInput {
  /** Server-side bearer token for the current request/user. Never shared across requests. */
  accessToken?: string;
  /** BCP-47-ish locale tag (fr, en, ar) propagated as Accept-Language. */
  locale?: string;
  /** Caller-supplied correlation id. A fresh crypto.randomUUID() is generated when absent or invalid. */
  correlationId?: string;
}

export interface BuiltRequestHeaders {
  headers: Record<string, string>;
  correlationId: string;
}

export function buildRequestHeaders(input: BuildRequestHeadersInput = {}): BuiltRequestHeaders {
  const correlationId =
    input.correlationId !== undefined && isValidCorrelationId(input.correlationId)
      ? input.correlationId
      : crypto.randomUUID();

  const headers: Record<string, string> = {
    [CORRELATION_ID_HEADER]: correlationId,
  };

  if (input.locale) {
    headers["Accept-Language"] = input.locale;
  }

  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }

  return { headers, correlationId };
}
