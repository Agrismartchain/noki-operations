"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailItem,
  DetailList,
  StatusChip,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  AdminMutationBoundary,
  MutationForm,
  SubmitButton,
} from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import { DELIVERY_SHIPMENT_TONE } from "../tone-maps";
import type {
  CommerceShippingRecord,
  DeliveryDriverRecord,
  DeliveryShipmentRecord,
} from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function isCommerceShippingRecord(
  shipment: CommerceShippingRecord | DeliveryShipmentRecord,
): shipment is CommerceShippingRecord {
  return "shipmentStatus" in shipment;
}

function mutationLabels(t: ReturnType<typeof useTranslations>) {
  return {
    saving: t("common.actions.saving"),
    successTitle: t("mutations.successTitle"),
    errorTitle: t("mutations.errorTitle"),
    correlationId: t("mutations.correlationId"),
  };
}

interface AssignDriverFormProps {
  shipmentId: string;
  eligibleDrivers: DeliveryDriverRecord[];
  assignAction: StatefulMutationAction;
}

function AssignDriverForm({
  shipmentId,
  eligibleDrivers,
  assignAction,
}: AssignDriverFormProps) {
  const t = useTranslations();
  const [driverProfileId, setDriverProfileId] = useState("");
  const [phase, setPhase] = useState<"edit" | "confirm">("edit");
  const selectedDriver = eligibleDrivers.find(
    (driver) => driver.id === driverProfileId,
  );

  if (eligibleDrivers.length === 0) {
    return (
      <p className={styles.secondary}>
        {t("shipping.detail.noEligibleDrivers")}
      </p>
    );
  }

  if (phase === "confirm" && selectedDriver) {
    return (
      <div className={styles.container}>
        <p>
          {t("shipping.detail.confirmAssignDescription", {
            driver: selectedDriver.displayName,
          })}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPhase("edit")}
          >
            {t("shipping.detail.confirmBack")}
          </Button>
          <MutationForm action={assignAction} labels={mutationLabels(t)}>
            <>
              <input type="hidden" name="shipmentId" value={shipmentId} />
              <input
                type="hidden"
                name="driverProfileId"
                value={selectedDriver.id}
              />
              <SubmitButton pendingLabel={t("common.actions.saving")}>
                {t("shipping.actions.confirmAssign")}
              </SubmitButton>
            </>
          </MutationForm>
        </div>
      </div>
    );
  }

  return (
    <form
      className={styles.container}
      onSubmit={(event) => {
        event.preventDefault();
        if (driverProfileId) setPhase("confirm");
      }}
    >
      <label className={styles.field}>
        <span className={styles.label}>
          {t("shipping.detail.assignDriverLabel")}
        </span>
        <select
          className={styles.input}
          value={driverProfileId}
          onChange={(event) => setDriverProfileId(event.target.value)}
          required
        >
          <option value="" disabled>
            {t("shipping.detail.assignDriverPlaceholder")}
          </option>
          {eligibleDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {t("shipping.detail.driverOption", {
                name: driver.displayName,
                code: driver.code,
                active: driver.activeShipmentsCount,
              })}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.actionsRow}>
        <Button type="submit" variant="secondary" disabled={!driverProfileId}>
          {t("shipping.actions.reviewAssign")}
        </Button>
      </div>
    </form>
  );
}

export interface ShipmentDetailViewProps {
  shipment: CommerceShippingRecord | DeliveryShipmentRecord;
  eligibleDrivers?: DeliveryDriverRecord[];
  assignAction?: StatefulMutationAction;
  outForDeliveryAction?: StatefulMutationAction;
}

export function ShipmentDetailView({
  shipment,
  eligibleDrivers = [],
  assignAction,
  outForDeliveryAction,
}: ShipmentDetailViewProps) {
  const t = useTranslations();
  const commerce = isCommerceShippingRecord(shipment) ? shipment : null;
  const delivery = commerce ? null : (shipment as DeliveryShipmentRecord);
  const status = commerce ? commerce.shipmentStatus : delivery!.status;
  const orderNumber = shipment.orderNumber ?? shipment.id;
  const organizationName =
    commerce?.sellerName ?? delivery?.organizationName ?? null;
  const driverName = commerce
    ? commerce.driverName
    : delivery!.assignedDriverDisplayName;
  const location =
    commerce?.lastLatitude !== null &&
    commerce?.lastLongitude !== null &&
    commerce?.lastLatitude !== undefined &&
    commerce?.lastLongitude !== undefined
      ? `${commerce.lastLatitude.toFixed(5)}, ${commerce.lastLongitude.toFixed(5)}`
      : null;
  const canAssign = Boolean(assignAction) && status === "READY_FOR_DISPATCH";
  const canMarkOutForDelivery =
    Boolean(outForDeliveryAction) && status === "ASSIGNED";

  return (
    <AdminMutationBoundary>
      <div className={styles.grid}>
        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("shipping.detail.sections.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem
                label={t("shipping.columns.order")}
                value={orderNumber}
              />
              <DetailItem
                label={t("shipping.detail.organization")}
                value={organizationName ?? "-"}
              />
              {commerce ? (
                <DetailItem
                  label={t("shipping.columns.warehouse")}
                  value={commerce.warehouseName ?? "-"}
                />
              ) : null}
              {commerce ? (
                <DetailItem
                  label={t("shipping.detail.destination")}
                  value={commerce.destination ?? "-"}
                />
              ) : null}
              <DetailItem
                label={t("shipping.columns.status")}
                value={
                  <StatusChip tone={DELIVERY_SHIPMENT_TONE[status]}>
                    {t(`shipping.status.${status}`)}
                  </StatusChip>
                }
              />
              <DetailItem
                label={t("shipping.columns.driver")}
                value={driverName ?? t("shipping.unassigned")}
              />
              {commerce ? (
                <DetailItem
                  label={t("shipping.detail.driverPhone")}
                  value={commerce.driverPhoneMasked ?? "-"}
                />
              ) : null}
              <DetailItem
                label={t("shipping.columns.country")}
                value={shipment.countryCode}
              />
              {commerce ? (
                <DetailItem
                  label={t("shipping.columns.cod")}
                  value={`${commerce.codAmount} ${commerce.currencyCode ?? ""}`.trim()}
                />
              ) : null}
              {commerce ? (
                <DetailItem
                  label={t("shipping.detail.codCollected")}
                  value={commerce.codCollected ?? "-"}
                />
              ) : null}
              {commerce ? (
                <DetailItem
                  label={t("shipping.detail.codStatus")}
                  value={commerce.codStatus ?? "-"}
                />
              ) : null}
              {commerce ? (
                <DetailItem
                  label={t("shipping.detail.fulfillmentStatus")}
                  value={
                    commerce.fulfillmentStatus
                      ? t(
                          `shipping.fulfillmentStatus.${commerce.fulfillmentStatus}`,
                        )
                      : "-"
                  }
                />
              ) : null}
              {commerce ? (
                <DetailItem
                  label={t("shipping.columns.qc")}
                  value={
                    commerce.qcStatus
                      ? t(`shipping.qcStatus.${commerce.qcStatus}`)
                      : "-"
                  }
                />
              ) : null}
              {delivery?.fulfillmentTaskId ? (
                <DetailItem
                  label={t("shipping.detail.fulfillmentTaskId")}
                  value={shortId(delivery.fulfillmentTaskId)}
                />
              ) : null}
              {delivery ? (
                <DetailItem
                  label={t("shipping.columns.attempts")}
                  value={delivery.attemptsCount}
                />
              ) : null}
              {delivery ? (
                <DetailItem
                  label={t("shipping.columns.incidents")}
                  value={delivery.incidentsCount}
                />
              ) : null}
              {delivery ? (
                <DetailItem
                  label={t("shipping.detail.evidenceCount")}
                  value={delivery.evidenceCount}
                />
              ) : null}
              {delivery &&
              delivery.pickupLatitude !== null &&
              delivery.pickupLongitude !== null ? (
                <DetailItem
                  label={t("shipping.detail.pickupLocation")}
                  value={`${delivery.pickupLatitude.toFixed(5)}, ${delivery.pickupLongitude.toFixed(5)}`}
                />
              ) : null}
              {location ? (
                <DetailItem
                  label={t("shipping.detail.lastPosition")}
                  value={location}
                />
              ) : null}
              {commerce?.lastPositionAt ? (
                <DetailItem
                  label={t("shipping.detail.lastPositionAt")}
                  value={formatDate(commerce.lastPositionAt)}
                />
              ) : null}
              {shipment.assignedAt ? (
                <DetailItem
                  label={t("shipping.detail.assignedAt")}
                  value={formatDate(shipment.assignedAt)}
                />
              ) : null}
              {shipment.outForDeliveryAt ? (
                <DetailItem
                  label={t("shipping.detail.outForDeliveryAt")}
                  value={formatDate(shipment.outForDeliveryAt)}
                />
              ) : null}
              {shipment.deliveredAt ? (
                <DetailItem
                  label={t("shipping.detail.deliveredAt")}
                  value={formatDate(shipment.deliveredAt)}
                />
              ) : null}
              {shipment.failedAt ? (
                <DetailItem
                  label={t("shipping.detail.failedAt")}
                  value={formatDate(shipment.failedAt)}
                />
              ) : null}
              <DetailItem
                label={t("shipping.detail.updatedAt")}
                value={formatDate(shipment.updatedAt)}
              />
            </DetailList>
          </CardContent>
        </Card>

        {canAssign || canMarkOutForDelivery ? (
          <Card className={styles.full}>
            <CardHeader>
              <CardTitle>{t("shipping.detail.sections.actions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {canAssign ? (
                <AssignDriverForm
                  shipmentId={shipment.id}
                  eligibleDrivers={eligibleDrivers}
                  assignAction={assignAction!}
                />
              ) : null}
              {canMarkOutForDelivery ? (
                <MutationForm
                  action={outForDeliveryAction!}
                  labels={mutationLabels(t)}
                  className={styles.actionsRow}
                >
                  <>
                    <input
                      type="hidden"
                      name="shipmentId"
                      value={shipment.id}
                    />
                    <SubmitButton pendingLabel={t("common.actions.saving")}>
                      {t("shipping.actions.outForDelivery")}
                    </SubmitButton>
                  </>
                </MutationForm>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminMutationBoundary>
  );
}
