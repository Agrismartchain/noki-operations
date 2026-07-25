"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function QcTable({ tasks }: { tasks: FulfillmentTaskRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<FulfillmentTaskRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("qc.columns.order"),
      meta: { headerLabel: t("qc.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber}</span>
          <span className={styles.secondary}>{row.original.organizationName}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("qc.columns.warehouse"),
      meta: { headerLabel: t("qc.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "status",
      header: t("qc.columns.status"),
      meta: { headerLabel: t("qc.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={FULFILLMENT_TONE[row.original.status]}>{t(`qc.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "linesCount",
      header: t("qc.columns.lines"),
      meta: { headerLabel: t("qc.columns.lines"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.linesCount,
    },
    {
      accessorKey: "packedAt",
      header: t("qc.columns.packedAt"),
      meta: { headerLabel: t("qc.columns.packedAt"), priority: "low", nowrap: true },
      cell: ({ row }) => formatDate(row.original.packedAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("qc.table.ariaLabel")}
      data={tasks}
      columns={columns}
      getRowId={(task) => task.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("qc.empty.title")}
      emptyDescription={t("qc.empty.description")}
      rowActionsLabel={t("qc.columns.actions")}
      rowActions={(row) => (
        <Link href={`/qc/${row.original.id}`} className={styles.rowAction}>
          {t("qc.actions.view")}
        </Link>
      )}
    />
  );
}
