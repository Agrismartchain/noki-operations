import { randomUUID } from "node:crypto";

import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import { completeAdminMutation, mutationAccessTokenOrError } from "@/features/admin/server/mutation-result";
import { InventoryTable } from "@/features/operations/components/inventory-table";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { adjustStock, listInventory } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default async function InventoryPage({ params, searchParams }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "inventory.stock.read")) {
    return <ForbiddenView />;
  }
  const canAdjust = hasCapability(session.actor, "inventory.stock.adjust");

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const result = await listInventory(
    { search: filters.search, organizationId: filters.organizationId, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  async function adjustStockAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const organizationId = read(formData, "organizationId");
    const countryId = read(formData, "countryId");
    const countryCode = read(formData, "countryCode");
    const warehouseId = read(formData, "warehouseId");
    const productId = read(formData, "productId");
    const variantId = read(formData, "variantId");
    const type = read(formData, "type");
    if (
      !organizationId ||
      !countryId ||
      !countryCode ||
      !warehouseId ||
      !productId ||
      !variantId ||
      (type !== "ADJUSTMENT_IN" && type !== "ADJUSTMENT_OUT")
    ) {
      return { status: "error", resultId: randomUUID(), message: "Invalid stock adjustment request" };
    }
    const quantity = Number.parseInt(read(formData, "quantity"), 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { status: "error", resultId: randomUUID(), message: "quantity must be a strictly positive integer" };
    }
    const reason = read(formData, "reason");
    return completeAdminMutation({
      endpoint: "POST /v1/inventory/stock/adjustments",
      locale,
      revalidatePaths: [`/${locale}/inventory`],
      mutate: () =>
        adjustStock(
          {
            idempotencyKey: randomUUID(),
            organizationId,
            countryId,
            countryCode,
            warehouseId,
            productId,
            variantId,
            type,
            quantity,
            ...(reason ? { reason } : {}),
          },
          { accessToken: token, locale },
        ),
    });
  }

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("inventory.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("inventory.list.sectionLabel")}
        eyebrow={t("inventory.list.eyebrow")}
        title={t("inventory.list.title")}
        description={t("inventory.list.description")}
      />
      <InventoryTable records={result.items} adjustStockAction={canAdjust ? adjustStockAction : undefined} />
      <OpsPagination filters={filters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
