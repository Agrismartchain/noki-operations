import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { IncidentsTable } from "@/features/operations/components/incidents-table";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { OpsStatusTabs } from "@/features/operations/components/ops-status-tabs";
import { listDeliveryIncidents } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { INCIDENT_STATUSES, type IncidentStatus } from "@/features/operations/types";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

/**
 * Real, capability-gated route backed by GET /v1/admin/delivery/incidents.
 * Read-only for OPERATIONS -- DELIVERY_INCIDENT_RESOLVE is not granted to
 * this role, so no resolve action exists here. There is no
 * GET /admin/delivery/incidents/{id} route, so the detail view (see
 * IncidentsTable) renders from the already-fetched row data instead of a
 * dedicated [id] route.
 */
export default async function IncidentsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect({ href: "/login", locale });
    return;
  }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status === "unauthenticated") {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.status === "forbidden" || !hasCapability(session.actor, "incidents.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const status = (INCIDENT_STATUSES as readonly string[]).includes(filters.status ?? "") ? (filters.status as IncidentStatus) : undefined;
  const activeFilters = { ...filters, status };

  const result = await listDeliveryIncidents(
    { search: filters.search, organizationId: filters.organizationId, status, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("incidents.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("incidents.list.sectionLabel")}
        eyebrow={t("incidents.list.eyebrow")}
        title={t("incidents.list.title")}
        description={t("incidents.list.description")}
      />
      <OpsStatusTabs
        filters={activeFilters}
        aria-label={t("incidents.list.statusFilterLabel")}
        options={[
          { value: undefined, label: t("incidents.status.ALL") },
          ...INCIDENT_STATUSES.map((value) => ({ value, label: t(`incidents.status.${value}`) })),
        ]}
      />
      <IncidentsTable incidents={result.items} />
      <OpsPagination filters={activeFilters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
