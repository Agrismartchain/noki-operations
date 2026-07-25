import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { FetchLike } from "@/lib/api/timeout";

export type LoginRequestDto = components["schemas"]["LoginRequestDto"];
export type AuthTokensResponseDto = components["schemas"]["AuthTokensResponseDto"];
export type RefreshRequestDto = components["schemas"]["RefreshRequestDto"];
export type LogoutResponseDto = components["schemas"]["LogoutResponseDto"];
export type MeResponseDto = components["schemas"]["MeResponseDto"];
export type AuthCapabilitiesResponseDto = components["schemas"]["AuthCapabilitiesResponseDto"];

export interface BackendCallContext {
  locale?: string;
  correlationId?: string;
  fetch?: FetchLike;
}

interface OpenApiFetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function unwrap<T>(result: OpenApiFetchResult<T>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }

  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", {
      status: result.response.status,
    });
  }

  return result.data;
}

/** Calls POST /v1/auth/login (AuthController_login). No cookies involved on the backend side. */
export async function loginWithBackend(
  credentials: LoginRequestDto,
  context: BackendCallContext = {},
): Promise<AuthTokensResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/auth/login", { body: credentials });
  return unwrap(result);
}

/** Calls POST /v1/auth/refresh (AuthController_refresh). Rotates the refresh token; the previous one becomes unusable. */
export async function refreshWithBackend(
  input: RefreshRequestDto,
  context: BackendCallContext = {},
): Promise<AuthTokensResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/auth/refresh", { body: input });
  return unwrap(result);
}

/** Calls POST /v1/auth/logout (AuthController_logout). Requires the current access token as a bearer credential. */
export async function logoutWithBackend(
  accessToken: string,
  context: BackendCallContext = {},
): Promise<LogoutResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  const result = await client.POST("/v1/auth/logout", {});
  return unwrap(result);
}

/** Calls GET /v1/auth/me (AuthController_me). Requires "auth.me.read"; a valid session can still receive 403 without it. */
export async function fetchMeWithBackend(
  accessToken: string,
  context: BackendCallContext = {},
): Promise<MeResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  const result = await client.GET("/v1/auth/me", {});
  return unwrap(result);
}

/** Calls GET /v1/auth/capabilities. Returns backend-derived roles, scopes, and effective permissions. */
export async function fetchCapabilitiesWithBackend(
  accessToken: string,
  context: BackendCallContext = {},
): Promise<AuthCapabilitiesResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  const result = await client.GET("/v1/auth/capabilities", {});
  return unwrap(result);
}
