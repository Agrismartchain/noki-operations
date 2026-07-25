import { cache } from "react";

import { resolveSession, type ResolveSessionInput, type SessionResolution } from "./session";

/**
 * Request-scoped session dedupe for Server Components. React owns the cache
 * lifetime, and the access/refresh tokens remain part of the call key, so this
 * never becomes a process-wide user/session cache.
 */
export const getServerSessionResolution = cache(
  async (
    accessToken: string | undefined,
    refreshToken: string | undefined,
    locale: string | undefined,
    allowRefresh = false,
  ): Promise<SessionResolution> => {
    const input: ResolveSessionInput = {
      accessToken,
      refreshToken,
      locale,
      allowRefresh,
    };

    return resolveSession(input);
  },
);
