"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatSince(t: ReturnType<typeof useTranslations>, value: string | null): string {
  if (!value) return "-";
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return "-";
  const hours = Math.max(0, Math.round((Date.now() - started) / (1000 * 60 * 60)));
  return t("packing.age.hoursAgo", { count: hours });
}

export function PackingTable({ tasks }: { tasks: FulfillmentTaskRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<FulfillmentTaskRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("packing.columns.order"),
      meta: { headerLabel: t("packing.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber}</span>
          <span className={styles.secondary}>{row.original.organizationName}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("packing.columns.warehouse"),
      meta: { headerLabel: t("packing.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "assignedActorDisplayName",
      header: t("packing.columns.assignee"),
      meta: { headerLabel: t("packing.columns.assignee"), priority: "medium" },
      cell: ({ row }) => row.original.assignedActorDisplayName ?? t("packing.unassigned"),
    },
    {
      accessorKey: "status",
      header: t("packing.columns.status"),
      meta: { headerLabel: t("packing.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={FULFILLMENT_TONE[row.original.status]}>{t(`packing.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "linesCount",
      header: t("packing.columns.lines"),
      meta: { headerLabel: t("packing.columns.lines"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.linesCount,
    },
    {
      accessorKey: "pickingStartedAt",
      header: t("packing.columns.age"),
      meta: { headerLabel: t("packing.columns.age"), priority: "low", nowrap: true },
      cell: ({ row }) => formatSince(t, row.original.pickingStartedAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("packing.table.ariaLabel")}
      data={tasks}
      columns={columns}
      getRowId={(task) => task.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("packing.empty.title")}
      emptyDescription={t("packing.empty.description")}
      rowActionsLabel={t("packing.columns.actions")}
      rowActions={(row) => (
        <Link href={`/packing/${row.original.id}`} className={styles.rowAction}>
          {t("packing.actions.view")}
        </Link>
      )}
    />
  );
}
