import { OpsStack } from "@/features/operations/components/ops-stack";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { InboundTable } from "@/features/operations/components/inbound-table";
import { OpsPageHeader } from "@/features/operations/components/ops-page-header";
import { OpsPagination } from "@/features/operations/components/ops-pagination";
import { listInbound } from "@/features/operations/server/client";
import { parseOpsListSearchParams, type OpsSearchParams } from "@/features/operations/server/list-query";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpsSearchParams>;
};

export default async function InboundPage({ params, searchParams }: PageProps) {
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
  const result = await listInbound(
    { search: filters.search, organizationId: filters.organizationId, page: filters.page, pageSize: filters.pageSize },
    { accessToken, locale },
  );

  return (
    <OpsStack>
      <OpsPageHeader
        breadcrumbsLabel={t("inbound.list.breadcrumbsLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("inbound.list.sectionLabel")}
        eyebrow={t("inbound.list.eyebrow")}
        title={t("inbound.list.title")}
        description={t("inbound.list.description")}
      />
      <InboundTable shipments={result.items} />
      <OpsPagination filters={filters} page={result.page} pageSize={result.pageSize} total={result.total} />
    </OpsStack>
  );
}
