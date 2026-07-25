"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, StatusChip } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { DELIVERY_SHIPMENT_TONE } from "../tone-maps";
import type { CommerceShippingRecord, DeliveryShipmentRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

/**
 * Read-only by design -- OPERATIONS has DELIVERY_ADMIN_READ but not the
 * shipment-mutation permission codes (e.g. DELIVERY_SHIPMENT_ASSIGN), so no
 * action forms are rendered here.
 */
function isCommerceShippingRecord(shipment: CommerceShippingRecord | DeliveryShipmentRecord): shipment is CommerceShippingRecord {
  return "shipmentStatus" in shipment;
}

export function ShipmentDetailView({ shipment }: { shipment: CommerceShippingRecord | DeliveryShipmentRecord }) {
  const t = useTranslations();
  const commerce = isCommerceShippingRecord(shipment) ? shipment : null;
  const delivery = commerce ? null : (shipment as DeliveryShipmentRecord);
  const status = commerce ? commerce.shipmentStatus : delivery!.status;
  const orderNumber = shipment.orderNumber ?? shipment.id;
  const organizationName = commerce?.sellerName ?? delivery?.organizationName ?? null;
  const driverName = commerce ? commerce.driverName : delivery!.assignedDriverDisplayName;
  const location =
    commerce?.lastLatitude !== null && commerce?.lastLongitude !== null && commerce?.lastLatitude !== undefined && commerce?.lastLongitude !== undefined
      ? `${commerce.lastLatitude.toFixed(5)}, ${commerce.lastLongitude.toFixed(5)}`
      : null;

  return (
    <div className={styles.grid}>
      <Card className={styles.full}>
        <CardHeader>
          <CardTitle>{t("shipping.detail.sections.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={t("shipping.columns.order")} value={orderNumber} />
            <DetailItem label={t("shipping.detail.organization")} value={organizationName ?? "-"} />
            {commerce ? <DetailItem label={t("shipping.columns.warehouse")} value={commerce.warehouseName ?? "-"} /> : null}
            {commerce ? <DetailItem label={t("shipping.detail.destination")} value={commerce.destination ?? "-"} /> : null}
            <DetailItem
              label={t("shipping.columns.status")}
              value={<StatusChip tone={DELIVERY_SHIPMENT_TONE[status]}>{t(`shipping.status.${status}`)}</StatusChip>}
            />
            <DetailItem label={t("shipping.columns.driver")} value={driverName ?? t("shipping.unassigned")} />
            {commerce ? <DetailItem label={t("shipping.detail.driverPhone")} value={commerce.driverPhoneMasked ?? "-"} /> : null}
            <DetailItem label={t("shipping.columns.country")} value={shipment.countryCode} />
            {commerce ? <DetailItem label={t("shipping.columns.cod")} value={`${commerce.codAmount} ${commerce.currencyCode ?? ""}`.trim()} /> : null}
            {commerce ? <DetailItem label={t("shipping.detail.codCollected")} value={commerce.codCollected ?? "-"} /> : null}
            {commerce ? <DetailItem label={t("shipping.detail.codStatus")} value={commerce.codStatus ?? "-"} /> : null}
            {commerce ? <DetailItem label={t("shipping.detail.fulfillmentStatus")} value={commerce.fulfillmentStatus ? t(`shipping.fulfillmentStatus.${commerce.fulfillmentStatus}`) : "-"} /> : null}
            {commerce ? <DetailItem label={t("shipping.columns.qc")} value={commerce.qcStatus ? t(`shipping.qcStatus.${commerce.qcStatus}`) : "-"} /> : null}
            {delivery?.fulfillmentTaskId ? (
              <DetailItem label={t("shipping.detail.fulfillmentTaskId")} value={shortId(delivery.fulfillmentTaskId)} />
            ) : null}
            {delivery ? <DetailItem label={t("shipping.columns.attempts")} value={delivery.attemptsCount} /> : null}
            {delivery ? <DetailItem label={t("shipping.columns.incidents")} value={delivery.incidentsCount} /> : null}
            {delivery ? <DetailItem label={t("shipping.detail.evidenceCount")} value={delivery.evidenceCount} /> : null}
            {delivery && delivery.pickupLatitude !== null && delivery.pickupLongitude !== null ? (
              <DetailItem
                label={t("shipping.detail.pickupLocation")}
                value={`${delivery.pickupLatitude.toFixed(5)}, ${delivery.pickupLongitude.toFixed(5)}`}
              />
            ) : null}
            {location ? <DetailItem label={t("shipping.detail.lastPosition")} value={location} /> : null}
            {commerce?.lastPositionAt ? <DetailItem label={t("shipping.detail.lastPositionAt")} value={formatDate(commerce.lastPositionAt)} /> : null}
            {shipment.assignedAt ? <DetailItem label={t("shipping.detail.assignedAt")} value={formatDate(shipment.assignedAt)} /> : null}
            {shipment.outForDeliveryAt ? (
              <DetailItem label={t("shipping.detail.outForDeliveryAt")} value={formatDate(shipment.outForDeliveryAt)} />
            ) : null}
            {shipment.deliveredAt ? <DetailItem label={t("shipping.detail.deliveredAt")} value={formatDate(shipment.deliveredAt)} /> : null}
            {shipment.failedAt ? <DetailItem label={t("shipping.detail.failedAt")} value={formatDate(shipment.failedAt)} /> : null}
            <DetailItem label={t("shipping.detail.updatedAt")} value={formatDate(shipment.updatedAt)} />
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}
