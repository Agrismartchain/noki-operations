import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { OpsStatusTabs } from "@/features/operations/components/ops-status-tabs";
import { ShipmentsTable } from "@/features/operations/components/shipments-table";
import { listCommerceShipping } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { DELIVERY_SHIPMENT_STATUSES, type DeliveryShipmentStatus } from "@/features/operations/types";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

/**
 * Real, capability-gated route reusing DeliveryShipment (no competing
 * ShippingOrder model) via GET /v1/admin/delivery/shipments. Read-only for
 * OPERATIONS by design -- no shipment assign/update permission is granted to
 * this role, so no mutation controls exist here.
 */
export default async function ShippingPage({ params, searchParams }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "delivery.admin.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const status = (DELIVERY_SHIPMENT_STATUSES as readonly string[]).includes(filters.status ?? "") ? (filters.status as DeliveryShipmentStatus) : undefined;
  const activeFilters = { ...filters, status };

  const result = await listCommerceShipping(
    { search: filters.search, organizationId: filters.organizationId, status, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("shipping.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("shipping.list.sectionLabel")}
        eyebrow={t("shipping.list.eyebrow")}
        title={t("shipping.list.title")}
        description={t("shipping.list.description")}
      />
      <OpsStatusTabs
        filters={activeFilters}
        aria-label={t("shipping.list.statusFilterLabel")}
        options={[
          { value: undefined, label: t("shipping.status.ALL") },
          ...DELIVERY_SHIPMENT_STATUSES.map((value) => ({ value, label: t(`shipping.status.${value}`) })),
        ]}
      />
      <ShipmentsTable shipments={result.items} />
      <OpsPagination filters={activeFilters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
