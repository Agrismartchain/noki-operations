import type { FetchLike } from "./timeout";

/**
 * Explicit per-call context used to build a NOKI API client. There is no
 * global/module-level client or token: every request builds its own client
 * from its own context so that no token is ever shared across users or
 * requests.
 */
export interface NokiRequestContext {
  /** Server-side bearer token for the current request's actor, if any. */
  accessToken?: string;
  /** Current locale, propagated as Accept-Language. */
  locale?: string;
  /** Correlation id to reuse; a fresh one is generated when absent. */
  correlationId?: string;
  /** Aborts the request (e.g. propagated from an incoming Route Handler request). */
  signal?: AbortSignal;
  /** Overrides the default request timeout. */
  timeoutMs?: number;
  /** Injectable fetch implementation, primarily for tests. */
  fetch?: FetchLike;
}
