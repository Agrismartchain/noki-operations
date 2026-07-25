import { NokiApiError } from "@/lib/api/errors";

import {
  fetchCapabilitiesWithBackend,
  fetchMeWithBackend,
  refreshWithBackend,
  type AuthCapabilitiesResponseDto,
  type MeResponseDto,
} from "./backend";
import type { AuthTokenPair } from "./cookies";

export interface CountryScope {
  organizationCountryId: string | null;
  countryCode: string;
}

export interface Role {
  roleId: string;
  code: string;
  description: string | null;
}

export interface Membership {
  membershipId: string;
  organizationId: string;
  countryScopes: CountryScope[];
  roles: Role[];
  permissionCodes: string[];
}

/**
 * Only fields returned by the auth contract are exposed here. Roles and
 * permissions come from GET /v1/auth/capabilities, never from frontend probes.
 */
export interface SanitizedActor {
  actorId: string;
  displayName: string;
  email: string | null;
  memberships: Membership[];
  effectivePermissionCodes: string[];
  capabilities: string[];
}

/**
 * MeResponseDto.email and CountryScopeResponseDto.organizationCountryId are
 * both typed as `Record<string, never>` (optionally `| null`) in the
 * generated schema: the canonical OpenAPI contract declares them as
 * `type: "object"` even though the backend actually returns `string | null`
 * for both (see AuthService.me in noki-api). Narrow defensively at runtime
 * instead of asserting a type the contract does not declare.
 */
function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sanitizeCapabilities(dto: AuthCapabilitiesResponseDto): Map<string, Omit<Membership, "membershipId" | "organizationId">> {
  return new Map(
    dto.memberships.map((membership) => [
      membership.membershipId,
      {
        countryScopes: membership.countryScopes.map((scope) => ({
          organizationCountryId: asNullableString(scope.organizationCountryId),
          countryCode: scope.countryCode,
        })),
        roles: membership.roles.map((role) => ({
          roleId: role.roleId,
          code: role.code,
          description: asNullableString(role.description),
        })),
        permissionCodes: uniqueSorted(membership.permissionCodes),
      },
    ]),
  );
}

function sanitizeActor(dto: MeResponseDto, capabilities: AuthCapabilitiesResponseDto): SanitizedActor {
  const capabilitiesByMembership = sanitizeCapabilities(capabilities);

  return {
    actorId: dto.actorId,
    displayName: dto.displayName,
    email: asNullableString(dto.email),
    memberships: dto.memberships.map((membership) => ({
      membershipId: membership.membershipId,
      organizationId: membership.organizationId,
      countryScopes:
        capabilitiesByMembership.get(membership.membershipId)?.countryScopes ??
        membership.countryScopes.map((scope) => ({
          organizationCountryId: asNullableString(scope.organizationCountryId),
          countryCode: scope.countryCode,
        })),
      roles: capabilitiesByMembership.get(membership.membershipId)?.roles ?? [],
      permissionCodes: capabilitiesByMembership.get(membership.membershipId)?.permissionCodes ?? [],
    })),
    effectivePermissionCodes: uniqueSorted(capabilities.effectivePermissionCodes),
    capabilities: uniqueSorted(capabilities.capabilities),
  };
}

export type SessionResolution =
  | { status: "unauthenticated" }
  | { status: "forbidden"; rotatedTokens?: AuthTokenPair }
  | { status: "authenticated"; actor: SanitizedActor; rotatedTokens?: AuthTokenPair };

export interface ResolveSessionInput {
  accessToken?: string;
  refreshToken?: string;
  locale?: string;
  correlationId?: string;
  /**
   * Attempts a single refresh when the access token is rejected. Only the
   * caller that can persist the resulting cookies (a Route Handler) should
   * set this to true -- Next.js Server Components cannot set cookies during
   * render, and the refresh token is single-use, so calling refresh without
   * persisting the rotated pair would silently break the session on the next
   * request.
   */
  allowRefresh?: boolean;
}

async function callMe(
  accessToken: string,
  input: Pick<ResolveSessionInput, "locale" | "correlationId">,
): Promise<{ kind: "success"; actor: SanitizedActor } | { kind: "unauthorized" } | { kind: "forbidden" }> {
  try {
    const dto = await fetchMeWithBackend(accessToken, { locale: input.locale, correlationId: input.correlationId });
    const capabilities = await fetchCapabilitiesWithBackend(accessToken, { locale: input.locale, correlationId: input.correlationId });
    return { kind: "success", actor: sanitizeActor(dto, capabilities) };
  } catch (error) {
    if (error instanceof NokiApiError && error.kind === "forbidden") {
      return { kind: "forbidden" };
    }
    if (error instanceof NokiApiError && error.kind === "unauthorized") {
      return { kind: "unauthorized" };
    }
    throw error;
  }
}

export type PermissionSource = Pick<SanitizedActor, "capabilities" | "effectivePermissionCodes"> | readonly string[];

export function hasPermission(source: PermissionSource, permission: string): boolean {
  if ("capabilities" in source) return source.capabilities.includes(permission) || source.effectivePermissionCodes.includes(permission);
  return source.includes(permission);
}

export function hasCapability(actor: SanitizedActor, capability: string): boolean {
  return hasPermission(actor, capability);
}

export async function resolveSession(input: ResolveSessionInput): Promise<SessionResolution> {
  if (!input.accessToken) {
    return { status: "unauthenticated" };
  }

  const meResult = await callMe(input.accessToken, input);

  if (meResult.kind === "success") {
    return { status: "authenticated", actor: meResult.actor };
  }

  if (meResult.kind === "forbidden") {
    return { status: "forbidden" };
  }

  if (!input.allowRefresh || !input.refreshToken) {
    return { status: "unauthenticated" };
  }

  let rotatedTokens: AuthTokenPair;
  try {
    const rotated = await refreshWithBackend(
      { refreshToken: input.refreshToken },
      { locale: input.locale, correlationId: input.correlationId },
    );
    rotatedTokens = {
      accessToken: rotated.accessToken,
      accessTokenExpiresIn: rotated.accessTokenExpiresIn,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresIn: rotated.refreshTokenExpiresIn,
    };
  } catch {
    return { status: "unauthenticated" };
  }

  const retryResult = await callMe(rotatedTokens.accessToken, input);

  if (retryResult.kind === "success") {
    return { status: "authenticated", actor: retryResult.actor, rotatedTokens };
  }

  if (retryResult.kind === "forbidden") {
    return { status: "forbidden", rotatedTokens };
  }

  return { status: "unauthenticated" };
}
