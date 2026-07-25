/**
 * Purely technical error classification for NOKI API calls. This is not a
 * business error model: it only distinguishes transport/protocol failure
 * modes so BFF route handlers can react (retry once, clear a session, map to
 * a translated message) without ever forwarding backend internals, tokens,
 * or stack traces to the browser.
 */
export type NokiApiErrorKind =
  | "config"
  | "network"
  | "timeout"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "server_error"
  | "unexpected";

const STATUS_TO_KIND: Record<number, NokiApiErrorKind> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  409: "conflict",
  422: "unprocessable",
  429: "rate_limited",
};

function kindFromStatus(status: number): NokiApiErrorKind {
  if (status in STATUS_TO_KIND) {
    return STATUS_TO_KIND[status] as NokiApiErrorKind;
  }
  if (status >= 500) {
    return "server_error";
  }
  return "unexpected";
}

/**
 * Shape produced by noki-api's global ApiExceptionFilter. Recognized only to
 * extract a correlation id and an API error code for observability; the raw
 * `message` is never surfaced to the browser as-is.
 */
export interface RecognizedApiErrorPayload {
  statusCode?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
  correlationId?: unknown;
}

export interface NokiApiValidationDetail {
  field: string;
  messages: string[];
}

export interface NokiApiErrorOptions {
  status?: number;
  apiCode?: string;
  correlationId?: string;
  details?: NokiApiValidationDetail[];
  cause?: unknown;
}

export class NokiApiError extends Error {
  readonly kind: NokiApiErrorKind;
  readonly status?: number;
  readonly apiCode?: string;
  readonly correlationId?: string;
  readonly details: NokiApiValidationDetail[];

  constructor(kind: NokiApiErrorKind, message: string, options: NokiApiErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "NokiApiError";
    this.kind = kind;
    this.status = options.status;
    this.apiCode = options.apiCode;
    this.correlationId = options.correlationId;
    this.details = options.details ?? [];
  }

  /**
   * Sanitized representation safe to send to the browser: no stack trace, no
   * token, no raw backend message, no internal URL.
   */
  toSafeJSON(): {
    kind: NokiApiErrorKind;
    status?: number;
    apiCode?: string;
    correlationId?: string;
    details?: NokiApiValidationDetail[];
  } {
    return {
      kind: this.kind,
      status: this.status,
      apiCode: this.apiCode,
      correlationId: this.correlationId,
      details: this.details.length > 0 ? this.details : undefined,
    };
  }
}

function isRecognizedApiErrorPayload(value: unknown): value is RecognizedApiErrorPayload {
  return typeof value === "object" && value !== null;
}

function sanitizeApiDetails(value: unknown): NokiApiValidationDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const record = item as Record<string, unknown>;
    if (typeof record.field !== "string" || !Array.isArray(record.messages)) {
      return [];
    }

    const messages = record.messages.filter((message): message is string => typeof message === "string");
    if (messages.length === 0) {
      return [];
    }

    return [{ field: record.field, messages: messages.slice(0, 4) }];
  });
}

/**
 * Normalizes a non-ok HTTP response (as surfaced by openapi-fetch's `error`
 * field) into a NokiApiError. Recognizes noki-api's standard error envelope
 * ({statusCode, code, message, correlationId, ...}) when present, otherwise
 * falls back to a generic "unexpected" classification without inventing a
 * shape the backend does not actually return.
 */
export function toNokiApiError(status: number, body: unknown): NokiApiError {
  const kind = kindFromStatus(status);

  if (isRecognizedApiErrorPayload(body)) {
    const apiCode = typeof body.code === "string" ? body.code : undefined;
    const correlationId = typeof body.correlationId === "string" ? body.correlationId : undefined;
    const details = sanitizeApiDetails(body.details);

    return new NokiApiError(kind, `NOKI API request failed with status ${status}.`, {
      status,
      apiCode,
      correlationId,
      details,
    });
  }

  return new NokiApiError("unexpected", `NOKI API returned an unrecognized error payload (status ${status}).`, {
    status,
  });
}
