import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { FoodOrdersTable } from "@/features/operations/components/food-orders-table";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { OpsStatusTabs } from "@/features/operations/components/ops-status-tabs";
import { listFoodOrders } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { FOOD_ORDER_STATUSES, type FoodOrderStatus } from "@/features/operations/types";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

/**
 * Real, capability-gated route backed by GET /v1/admin/food/orders
 * (FOOD-P0-OPERATIONS-ACCESS). Read-only for OPERATIONS -- FOOD_ORDER_MANAGE
 * is not granted to this role, so no transition/assign action exists here;
 * dispatch/assign for the linked DeliveryShipment happens on the existing
 * /shipping/{id} detail page, which this page's rows link out to.
 */
export default async function FoodOrdersPage({ params, searchParams }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "food.order.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const status = (FOOD_ORDER_STATUSES as readonly string[]).includes(filters.status ?? "") ? (filters.status as FoodOrderStatus) : undefined;
  const activeFilters = { ...filters, status };

  const result = await listFoodOrders(
    { status, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("food.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("food.list.sectionLabel")}
        eyebrow={t("food.list.eyebrow")}
        title={t("food.list.title")}
        description={t("food.list.description")}
      />
      <OpsStatusTabs
        filters={activeFilters}
        aria-label={t("food.list.statusFilterLabel")}
        options={[
          { value: undefined, label: t("food.status.ALL") },
          ...FOOD_ORDER_STATUSES.map((value) => ({ value, label: t(`food.status.${value}`) })),
        ]}
      />
      <FoodOrdersTable orders={result.items} />
      <OpsPagination filters={activeFilters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
