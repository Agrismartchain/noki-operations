export {
  fetchCapabilitiesWithBackend,
  fetchMeWithBackend,
  loginWithBackend,
  logoutWithBackend,
  refreshWithBackend,
} from "./backend";
export type {
  AuthCapabilitiesResponseDto,
  AuthTokensResponseDto,
  BackendCallContext,
  LoginRequestDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshRequestDto,
} from "./backend";

export {
  ACCESS_TOKEN_COOKIE,
  applyAuthCookies,
  buildAccessTokenCookie,
  buildRefreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from "./cookies";
export type { AuthTokenPair } from "./cookies";

export { jsonError, mapLoginErrorToResponse, readAcceptLanguage } from "./http";
export type { SanitizedErrorBody } from "./http";

export { isSameOriginRequest } from "./origin";

export { MAX_LOGIN_BODY_BYTES, parseLoginBody, readBoundedBody } from "./request-body";
export type { LoginBody } from "./request-body";

export { getServerSessionResolution } from "./server-session";

export { hasCapability, hasPermission, resolveSession } from "./session";
export type { CountryScope, Membership, PermissionSource, ResolveSessionInput, Role, SanitizedActor, SessionResolution } from "./session";
