import { createNokiClient } from "@agrismartchain/noki-shared-contracts/client";

import { resolveApiBaseUrl } from "./config";
import { buildRequestHeaders } from "./headers";
import type { NokiRequestContext } from "./request-context";
import { createTimeoutFetch, DEFAULT_TIMEOUT_MS } from "./timeout";

export type NokiClient = ReturnType<typeof createNokiClient>;

export interface ServerNokiClient {
  client: NokiClient;
  correlationId: string;
}

/**
 * Builds a typed NOKI API client for a single request/context. This is a
 * factory, never a shared singleton: every call gets its own client, its own
 * headers, and its own token, so nothing about one user's request can leak
 * into another's.
 *
 * Requires NOKI_API_BASE_URL only at the moment of construction (not at
 * import/build time), and never talks to Postgres or Redis directly -- this
 * module's only network boundary is the NOKI API itself.
 */
export function createServerNokiClient(context: NokiRequestContext = {}): ServerNokiClient {
  const baseUrl = resolveApiBaseUrl();
  const { headers, correlationId } = buildRequestHeaders({
    accessToken: context.accessToken,
    locale: context.locale,
    correlationId: context.correlationId,
  });

  const fetchImpl = createTimeoutFetch(
    context.fetch ?? fetch,
    context.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    context.signal,
  );

  const client = createNokiClient({
    baseUrl,
    fetch: fetchImpl,
    headers,
  });

  return { client, correlationId };
}
