import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import {
  completeAdminMutation,
  mutationAccessTokenOrError,
} from "@/features/admin/server/mutation-result";
import { ShipmentDetailView } from "@/features/operations/components/shipment-detail-view";
import {
  assignDeliveryShipment,
  getDeliveryShipment,
  listCommerceShipping,
  listDeliveryDrivers,
  markShipmentOutForDelivery,
} from "@/features/operations/server/client";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect({ href: "/login", locale });
    return;
  }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const session = await getServerSessionResolution(
    accessToken,
    refreshToken,
    locale,
  );
  if (session.status === "unauthenticated") {
    redirect({ href: "/login", locale });
    return;
  }
  if (
    session.status === "forbidden" ||
    !hasCapability(session.actor, "delivery.admin.read")
  ) {
    return <ForbiddenView />;
  }

  const canAssign = hasCapability(session.actor, "delivery.shipment.assign");
  const canMarkOutForDelivery = hasCapability(
    session.actor,
    "delivery.shipment.update",
  );

  const shipment = await getDeliveryShipment(id, { accessToken, locale });
  const commerceRow = shipment.orderNumber
    ? (
        await listCommerceShipping(
          {
            search: shipment.orderNumber,
            organizationId: shipment.organizationId,
            countryId: shipment.countryId,
            pageSize: 10,
          },
          { accessToken, locale },
        ).catch(() => ({ items: [] }))
      ).items.find((row) => row.id === shipment.id)
    : undefined;

  const eligibleDrivers =
    canAssign && shipment.status === "READY_FOR_DISPATCH"
      ? (
          await listDeliveryDrivers(
            {
              organizationId: shipment.organizationId,
              countryId: shipment.countryId,
              status: "ACTIVE",
              pageSize: 100,
            },
            { accessToken, locale },
          ).catch(() => ({ items: [] }))
        ).items.sort((a, b) => a.activeShipmentsCount - b.activeShipmentsCount)
      : [];

  async function assignAction(
    _state: AdminMutationResult,
    formData: FormData,
  ): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    const driverProfileId = read(formData, "driverProfileId");
    if (!shipmentId || !driverProfileId)
      return {
        status: "error",
        resultId: randomUUID(),
        message: "Invalid request",
      };
    return completeAdminMutation({
      endpoint: "POST /v1/delivery/shipments/{id}/assign",
      locale,
      revalidatePaths: [`/${locale}/shipping/${shipmentId}`],
      mutate: () =>
        assignDeliveryShipment(shipmentId, driverProfileId, {
          accessToken: token,
          locale,
        }),
    });
  }

  async function outForDeliveryAction(
    _state: AdminMutationResult,
    formData: FormData,
  ): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    if (!shipmentId)
      return {
        status: "error",
        resultId: randomUUID(),
        message: "Invalid request",
      };
    return completeAdminMutation({
      endpoint: "POST /v1/delivery/shipments/{id}/out-for-delivery",
      locale,
      revalidatePaths: [`/${locale}/shipping/${shipmentId}`],
      mutate: () =>
        markShipmentOutForDelivery(shipmentId, { accessToken: token, locale }),
    });
  }

  return (
    <ShipmentDetailView
      shipment={commerceRow ?? shipment}
      eligibleDrivers={eligibleDrivers}
      assignAction={canAssign ? assignAction : undefined}
      outForDeliveryAction={
        canMarkOutForDelivery ? outForDeliveryAction : undefined
      }
    />
  );
}
