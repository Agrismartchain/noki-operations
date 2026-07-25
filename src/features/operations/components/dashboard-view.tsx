"use client";

import { Card, CardContent, CardHeader, CardTitle, Grid, MetricCard, PageHeader, Stack } from "@agrismartchain/noki-design-system";
import { useFormatter, useTranslations } from "next-intl";

import type { OperationsOverview } from "../types";

export interface DashboardViewProps {
  overview: OperationsOverview;
  qcPendingTotal: number;
  qcFailedTotal: number;
  inboundInTransitTotal: number;
}

export function DashboardView({ overview, qcPendingTotal, qcFailedTotal, inboundInTransitTotal }: DashboardViewProps) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <Stack gap="lg">
      <PageHeader eyebrow={t("common.brand")} title={t("dashboard.title")} description={t("dashboard.description")} />
      <p>
        {t("dashboard.generatedAt", {
          date: format.dateTime(new Date(overview.generatedAt), { dateStyle: "medium", timeStyle: "short" }),
        })}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.warehouses")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid columns={2} gap="md">
            <MetricCard label={t("dashboard.metrics.warehousesTotal")} value={overview.warehouses.total} />
            <MetricCard label={t("dashboard.metrics.warehousesActive")} value={overview.warehouses.active} />
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.inventory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid columns={4} gap="md">
            <MetricCard label={t("dashboard.metrics.inboundInTransit")} value={inboundInTransitTotal} />
            <MetricCard label={t("dashboard.metrics.inventoryOnHand")} value={overview.inventory.onHandQuantity} />
            <MetricCard label={t("dashboard.metrics.inventoryAvailable")} value={overview.inventory.availableQuantity} />
            <MetricCard label={t("dashboard.metrics.activeReservations")} value={overview.inventory.activeReservations} />
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.fulfillment")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid columns={4} gap="md">
            <MetricCard label={t("dashboard.metrics.fulfillmentOpen")} value={overview.fulfillment.open} />
            <MetricCard label={t("dashboard.metrics.fulfillmentAssigned")} value={overview.fulfillment.assigned} />
            <MetricCard label={t("dashboard.metrics.fulfillmentPicking")} value={overview.fulfillment.picking} />
            <MetricCard label={t("dashboard.metrics.fulfillmentPacked")} value={overview.fulfillment.packed} />
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.quality")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid columns={3} gap="md">
            <MetricCard label={t("dashboard.metrics.qcPending")} value={qcPendingTotal} />
            <MetricCard label={t("dashboard.metrics.qcFailed")} value={qcFailedTotal} />
            <MetricCard label={t("dashboard.metrics.readyForDispatch")} value={overview.delivery.readyForDispatch} />
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sections.delivery")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid columns={3} gap="md">
            <MetricCard label={t("dashboard.metrics.activeShipments")} value={overview.delivery.activeShipments} />
            <MetricCard label={t("dashboard.metrics.openIncidents")} value={overview.proofing.openIncidents} />
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
