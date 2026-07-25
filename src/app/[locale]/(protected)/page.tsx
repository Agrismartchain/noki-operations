import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { DashboardView } from "@/features/operations/components/dashboard-view";
import { getOperationsOverview, listFulfillmentTasks, listInbound } from "@/features/operations/server/client";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Every tile in DashboardView comes directly from a real backend field: the
 * bulk from GET /v1/admin/operations/overview (AdminOperationsOverviewDto),
 * plus two cheap pageSize:1 GET /v1/admin/operations/fulfillment calls
 * (status=QC_PENDING / QC_FAILED, a real filter on this endpoint's own query
 * DTO) for the QC counters that overview does not itself aggregate.
 * "Inbound in transit" has no server-side status filter to lean on --
 * GET /v1/admin/commerce/inbound-shipments takes CommerceCodPageQueryDto,
 * which carries no `status` field at all (confirmed against the DTO source;
 * passing one is rejected with 400 VALIDATION_ERROR) -- so it is computed
 * from one bounded real page (pageSize 100) filtered here instead.
 * Deliberately NOT shown: a "low stock" tile and a "receipts today" tile --
 * neither has a real aggregate source on this role's reachable endpoints
 * without an unbounded client-side scan, so they are omitted rather than
 * approximated.
 */
export default async function OperationsDashboardPage({ params }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "operations.read")) {
    return <ForbiddenView />;
  }

  const context = { accessToken, locale };

  const [overview, qcPending, qcFailed, inboundPage] = await Promise.all([
    getOperationsOverview(context),
    listFulfillmentTasks({ status: "QC_PENDING", pageSize: 1 }, context),
    listFulfillmentTasks({ status: "QC_FAILED", pageSize: 1 }, context),
    listInbound({ pageSize: 100 }, context),
  ]);

  const inboundInTransitTotal = inboundPage.items.filter(
    (shipment) => shipment.status === "IN_TRANSIT" || shipment.status === "SHIPPED",
  ).length;

  return (
    <DashboardView
      overview={overview}
      qcPendingTotal={qcPending.total}
      qcFailedTotal={qcFailed.total}
      inboundInTransitTotal={inboundInTransitTotal}
    />
  );
}
