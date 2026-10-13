import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { FetchLike } from "@/lib/api/timeout";

export type LoginRequestDto = components["schemas"]["LoginRequestDto"];
export type AuthTokensResponseDto = components["schemas"]["AuthTokensResponseDto"];
export type AuthMfaChallengeResponseDto = components["schemas"]["AuthMfaChallengeResponseDto"];
export type MfaStatusResponseDto = components["schemas"]["MfaStatusResponseDto"];
export type MfaEnrollmentStartResponseDto = components["schemas"]["MfaEnrollmentStartResponseDto"];
export type MfaRecoveryCodesResponseDto = components["schemas"]["MfaRecoveryCodesResponseDto"];
export type MfaEnrollConfirmChallengeResponseDto = components["schemas"]["MfaEnrollConfirmChallengeResponseDto"];
export type MfaStepUpResponseDto = components["schemas"]["MfaStepUpResponseDto"];
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

export type LoginResult = AuthTokensResponseDto | AuthMfaChallengeResponseDto;

export function isMfaChallenge(result: LoginResult): result is AuthMfaChallengeResponseDto {
  return "mfaStatus" in result;
}

/**
 * Calls POST /v1/auth/login (AuthController_login). Privileged (internal staff) accounts get 202 + a challenge
 * instead of tokens: the second factor must be completed before any session exists.
 */
export async function loginWithBackend(
  credentials: LoginRequestDto,
  context: BackendCallContext = {},
): Promise<LoginResult> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/auth/login", { body: credentials });
  return unwrap(result) as LoginResult;
}

/** POST /v1/auth/mfa/challenge/verify - finishes sign-in with a TOTP or recovery code. */
export async function verifyMfaChallengeWithBackend(
  input: { challengeToken: string; code?: string; recoveryCode?: string },
  context: BackendCallContext = {},
): Promise<AuthTokensResponseDto> {
  const { client } = createServerNokiClient(context);
  return unwrap(await client.POST("/v1/auth/mfa/challenge/verify", { body: input }));
}

/** POST /v1/auth/mfa/challenge/enroll/start - the shared secret is returned exactly once. */
export async function startMfaChallengeEnrollmentWithBackend(
  challengeToken: string,
  context: BackendCallContext = {},
): Promise<MfaEnrollmentStartResponseDto> {
  const { client } = createServerNokiClient(context);
  return unwrap(await client.POST("/v1/auth/mfa/challenge/enroll/start", { body: { challengeToken } }));
}

/** POST /v1/auth/mfa/challenge/enroll/confirm - activates the factor, returns recovery codes once + the session. */
export async function confirmMfaChallengeEnrollmentWithBackend(
  input: { challengeToken: string; code: string },
  context: BackendCallContext = {},
): Promise<MfaEnrollConfirmChallengeResponseDto> {
  const { client } = createServerNokiClient(context);
  return unwrap(await client.POST("/v1/auth/mfa/challenge/enroll/confirm", { body: input }));
}

/** GET /v1/auth/mfa/status */
export async function fetchMfaStatusWithBackend(
  accessToken: string,
  context: BackendCallContext = {},
): Promise<MfaStatusResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  return unwrap(await client.GET("/v1/auth/mfa/status", {}));
}

/** POST /v1/auth/mfa/step-up - fresh proof for a bounded window before sensitive actions. */
export async function stepUpWithBackend(
  accessToken: string,
  input: { code?: string; recoveryCode?: string },
  context: BackendCallContext = {},
): Promise<MfaStepUpResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  return unwrap(await client.POST("/v1/auth/mfa/step-up", { body: input }));
}

/** POST /v1/auth/mfa/recovery-codes/regenerate - invalidates every previous code. */
export async function regenerateRecoveryCodesWithBackend(
  accessToken: string,
  input: { code: string },
  context: BackendCallContext = {},
): Promise<MfaRecoveryCodesResponseDto> {
  const { client } = createServerNokiClient({ ...context, accessToken });
  return unwrap(await client.POST("/v1/auth/mfa/recovery-codes/regenerate", { body: input }));
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
