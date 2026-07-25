import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { OpsStatusTabs } from "@/features/operations/components/ops-status-tabs";
import { QcTable } from "@/features/operations/components/qc-table";
import { listFulfillmentTasks } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import type { FulfillmentTaskStatus } from "@/features/operations/types";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

const QC_STATUSES: FulfillmentTaskStatus[] = ["PACKED", "QC_PENDING", "QC_FAILED"];

/**
 * QC-eligible queue: PACKED (never checked yet), QC_PENDING and QC_FAILED
 * (re-check candidates). QC_PASSED/READY_FOR_DISPATCH tasks are done and are
 * intentionally excluded from every tab -- the backend guard on
 * POST /admin/commerce/fulfillment/tasks/{id}/qc rejects any task outside
 * PACKED|QC_PENDING|QC_FAILED anyway.
 */
export default async function QcPage({ params, searchParams }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "commerce.qc.manage")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const status = (QC_STATUSES as string[]).includes(filters.status ?? "") ? (filters.status as FulfillmentTaskStatus) : "PACKED";
  const activeFilters = { ...filters, status };

  const result = await listFulfillmentTasks(
    { search: filters.search, organizationId: filters.organizationId, status, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("qc.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("qc.list.sectionLabel")}
        eyebrow={t("qc.list.eyebrow")}
        title={t("qc.list.title")}
        description={t("qc.list.description")}
      />
      <OpsStatusTabs
        filters={activeFilters}
        aria-label={t("qc.list.statusFilterLabel")}
        options={QC_STATUSES.map((value) => ({ value, label: t(`qc.status.${value}`) }))}
      />
      <QcTable tasks={result.items} />
      <OpsPagination filters={activeFilters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
