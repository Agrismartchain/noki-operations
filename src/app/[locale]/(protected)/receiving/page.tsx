import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { ReceiptsTable } from "@/features/operations/components/receipts-table";
import { listInboundReceipts } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

export default async function ReceivingPage({ params, searchParams }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "commerce.inbound.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const filters = parseOpsListSearchParams(await searchParams);
  const result = await listInboundReceipts(
    { search: filters.search, organizationId: filters.organizationId, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("receiving.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("receiving.list.sectionLabel")}
        eyebrow={t("receiving.list.eyebrow")}
        title={t("receiving.list.title")}
        description={t("receiving.list.description")}
      />
      <ReceiptsTable receipts={result.items} />
      <OpsPagination filters={filters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
