import { NokiApiError } from "./errors";

/** Default request timeout for server-side NOKI API calls. */
export const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchLike = typeof fetch;

/**
 * Wraps a fetch implementation with a deterministic timeout via
 * AbortController. Distinguishes three outcomes:
 * - the caller's own AbortSignal firing (propagated untouched);
 * - our timeout firing (normalized to a NokiApiError "timeout");
 * - any other fetch failure, e.g. DNS/connection errors (normalized to a
 *   NokiApiError "network").
 */
export function createTimeoutFetch(
  fetchImpl: FetchLike,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  externalSignal?: AbortSignal,
): FetchLike {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onExternalAbort);

    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (cause) {
      if (timedOut) {
        throw new NokiApiError("timeout", `NOKI API request timed out after ${timeoutMs}ms.`, { cause });
      }
      if (externalSignal?.aborted) {
        throw cause;
      }
      throw new NokiApiError("network", "Unable to reach the NOKI API.", { cause });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }) as FetchLike;
}
