"use client";

import {
  DataTable,
  DetailItem,
  DetailList,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  StatusChip,
  type DataTableColumn,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { INCIDENT_TONE } from "../tone-maps";
import type { DeliveryIncidentRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * Incidents have no `GET /admin/delivery/incidents/{id}` endpoint -- only
 * the list route exists. The detail drawer renders exclusively from the row
 * data already fetched by the list page, it does not perform a second
 * network call.
 */
function IncidentDetailDrawer({ incident, onClose }: { incident: DeliveryIncidentRecord | null; onClose: () => void }) {
  const t = useTranslations();

  return (
    <Drawer isOpen={incident !== null} onOpenChange={(open) => !open && onClose()} aria-label={t("incidents.detail.title")}>
      {incident ? (
        <>
          <DrawerHeader>
            <DrawerTitle>{t("incidents.detail.title")}</DrawerTitle>
          </DrawerHeader>
          <DrawerContent>
            <DetailList>
              <DetailItem label={t("incidents.columns.order")} value={incident.orderNumber} />
              <DetailItem label={t("incidents.columns.type")} value={t(`incidents.type.${incident.type}`)} />
              <DetailItem
                label={t("incidents.columns.status")}
                value={<StatusChip tone={INCIDENT_TONE[incident.status]}>{t(`incidents.status.${incident.status}`)}</StatusChip>}
              />
              <DetailItem label={t("incidents.columns.country")} value={incident.countryCode} />
              <DetailItem label={t("incidents.detail.reportedBy")} value={incident.actorDisplayName} />
              <DetailItem label={t("incidents.detail.comment")} value={incident.comment ?? t("incidents.detail.noComment")} />
              {incident.latitude !== null && incident.longitude !== null ? (
                <DetailItem
                  label={t("incidents.detail.location")}
                  value={`${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`}
                />
              ) : null}
              <DetailItem label={t("incidents.detail.createdAt")} value={formatDate(incident.createdAt)} />
              {incident.status === "RESOLVED" ? (
                <>
                  <DetailItem label={t("incidents.detail.resolvedBy")} value={incident.resolvedByActorDisplayName ?? "-"} />
                  <DetailItem label={t("incidents.detail.resolvedAt")} value={formatDate(incident.resolvedAt)} />
                </>
              ) : null}
            </DetailList>
          </DrawerContent>
        </>
      ) : null}
    </Drawer>
  );
}

export function IncidentsTable({ incidents }: { incidents: DeliveryIncidentRecord[] }) {
  const t = useTranslations();
  const [selected, setSelected] = useState<DeliveryIncidentRecord | null>(null);

  const columns: DataTableColumn<DeliveryIncidentRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("incidents.columns.order"),
      meta: { headerLabel: t("incidents.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber}</span>
          <span className={styles.secondary}>{row.original.organizationName}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("incidents.columns.type"),
      meta: { headerLabel: t("incidents.columns.type"), priority: "medium" },
      cell: ({ row }) => t(`incidents.type.${row.original.type}`),
    },
    {
      accessorKey: "status",
      header: t("incidents.columns.status"),
      meta: { headerLabel: t("incidents.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={INCIDENT_TONE[row.original.status]}>{t(`incidents.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "actorDisplayName",
      header: t("incidents.columns.reportedBy"),
      meta: { headerLabel: t("incidents.columns.reportedBy"), priority: "medium" },
      cell: ({ row }) => row.original.actorDisplayName,
    },
    {
      accessorKey: "createdAt",
      header: t("incidents.columns.createdAt"),
      meta: { headerLabel: t("incidents.columns.createdAt"), priority: "low", nowrap: true },
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <>
      <DataTable
        aria-label={t("incidents.table.ariaLabel")}
        data={incidents}
        columns={columns}
        getRowId={(incident) => incident.id}
        responsiveStrategy="priority-columns"
        emptyTitle={t("incidents.empty.title")}
        emptyDescription={t("incidents.empty.description")}
        rowActionsLabel={t("incidents.columns.actions")}
        rowActions={(row) => (
          <button type="button" className={`${styles.rowAction} ${styles.rowActionButton}`} onClick={() => setSelected(row.original)}>
            {t("incidents.actions.view")}
          </button>
        )}
      />
      <IncidentDetailDrawer incident={selected} onClose={() => setSelected(null)} />
    </>
  );
}
