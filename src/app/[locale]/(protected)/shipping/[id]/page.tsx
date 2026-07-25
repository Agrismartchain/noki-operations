import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { ShipmentDetailView } from "@/features/operations/components/shipment-detail-view";
import { getDeliveryShipment, listCommerceShipping } from "@/features/operations/server/client";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
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

  const shipment = await getDeliveryShipment(id, { accessToken, locale });
  const commerceRow = shipment.orderNumber
    ? (
        await listCommerceShipping(
          { search: shipment.orderNumber, organizationId: shipment.organizationId, countryId: shipment.countryId, pageSize: 10 },
          { accessToken, locale },
        ).catch(() => ({ items: [] }))
      ).items.find((row) => row.id === shipment.id)
    : undefined;

  return <ShipmentDetailView shipment={commerceRow ?? shipment} />;
}
