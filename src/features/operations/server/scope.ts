import type { SanitizedActor } from "@/lib/auth";

/**
 * The Commerce COD and admin-operations controllers accept an optional
 * `organizationId` query filter and otherwise scope every list to the
 * actor's own memberships server-side. Country-level pre-filtering is
 * intentionally not offered here: the session only exposes `countryCode`
 * and `organizationCountryId`, never the `Country.id` these endpoints
 * filter on. Omitting `countryId` still yields a correctly-scoped,
 * fail-closed result -- the backend restricts to the actor's authorized
 * countries by default.
 */
export interface OpsOrgScope {
  organizationId: string;
  availableOrganizationIds: string[];
}

export function resolveOpsOrgScope(actor: SanitizedActor, requestedOrganizationId?: string): OpsOrgScope | null {
  const availableOrganizationIds = [...new Set(actor.memberships.map((membership) => membership.organizationId))];
  if (availableOrganizationIds.length === 0) {
    return null;
  }

  const organizationId =
    requestedOrganizationId && availableOrganizationIds.includes(requestedOrganizationId)
      ? requestedOrganizationId
      : availableOrganizationIds[0];

  if (!organizationId) {
    return null;
  }

  return { organizationId, availableOrganizationIds };
}
