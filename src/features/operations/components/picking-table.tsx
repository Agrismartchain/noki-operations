"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatSince(t: ReturnType<typeof useTranslations>, value: string | null): string {
  if (!value) return t("picking.age.notStarted");
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return "-";
  const hours = Math.max(0, Math.round((Date.now() - started) / (1000 * 60 * 60)));
  return t("picking.age.hoursAgo", { count: hours });
}

export function PickingTable({ tasks }: { tasks: FulfillmentTaskRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<FulfillmentTaskRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("picking.columns.order"),
      meta: { headerLabel: t("picking.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber}</span>
          <span className={styles.secondary}>{row.original.organizationName}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("picking.columns.warehouse"),
      meta: { headerLabel: t("picking.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "assignedActorDisplayName",
      header: t("picking.columns.assignee"),
      meta: { headerLabel: t("picking.columns.assignee"), priority: "medium" },
      cell: ({ row }) => row.original.assignedActorDisplayName ?? t("picking.unassigned"),
    },
    {
      accessorKey: "status",
      header: t("picking.columns.status"),
      meta: { headerLabel: t("picking.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={FULFILLMENT_TONE[row.original.status]}>{t(`picking.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "linesCount",
      header: t("picking.columns.lines"),
      meta: { headerLabel: t("picking.columns.lines"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.linesCount,
    },
    {
      accessorKey: "pickingStartedAt",
      header: t("picking.columns.age"),
      meta: { headerLabel: t("picking.columns.age"), priority: "low", nowrap: true },
      cell: ({ row }) => formatSince(t, row.original.pickingStartedAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("picking.table.ariaLabel")}
      data={tasks}
      columns={columns}
      getRowId={(task) => task.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("picking.empty.title")}
      emptyDescription={t("picking.empty.description")}
      rowActionsLabel={t("picking.columns.actions")}
      rowActions={(row) => (
        <Link href={`/picking/${row.original.id}`} className={styles.rowAction}>
          {t("picking.actions.view")}
        </Link>
      )}
    />
  );
}
