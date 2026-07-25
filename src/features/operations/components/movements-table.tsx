"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import type { StockMovementRecord } from "../types";
import styles from "./ops-tables.module.css";

const MOVEMENT_TONE: Record<StockMovementRecord["type"], "neutral" | "info" | "success" | "warning" | "danger"> = {
  ADJUSTMENT_IN: "success",
  ADJUSTMENT_OUT: "warning",
  INBOUND_RECEIPT: "success",
  RESERVATION_CREATED: "info",
  RESERVATION_RELEASED: "neutral",
  PICK: "info",
  RELEASE: "neutral",
  TRANSFER: "info",
  RETURN: "warning",
  DAMAGE: "danger",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function MovementsTable({ movements }: { movements: StockMovementRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<StockMovementRecord>[] = [
    {
      accessorKey: "date",
      header: t("movements.columns.date"),
      meta: { headerLabel: t("movements.columns.date"), priority: "medium", nowrap: true },
      cell: ({ row }) => formatDateTime(row.original.date),
    },
    {
      accessorKey: "productName",
      header: t("movements.columns.product"),
      meta: { headerLabel: t("movements.columns.product"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.productName}</span>
          <span className={styles.secondary}>{row.original.sku}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("movements.columns.type"),
      meta: { headerLabel: t("movements.columns.type"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={MOVEMENT_TONE[row.original.type]}>{t(`movements.types.${row.original.type}`)}</StatusChip>,
    },
    {
      accessorKey: "warehouseName",
      header: t("movements.columns.warehouse"),
      meta: { headerLabel: t("movements.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "quantity",
      header: t("movements.columns.quantity"),
      meta: { headerLabel: t("movements.columns.quantity"), numeric: true, priority: "high" },
      cell: ({ row }) => row.original.quantity,
    },
    {
      accessorKey: "actorName",
      header: t("movements.columns.actor"),
      meta: { headerLabel: t("movements.columns.actor"), priority: "low" },
      cell: ({ row }) => row.original.actorName ?? "-",
    },
  ];

  return (
    <DataTable
      aria-label={t("movements.table.ariaLabel")}
      data={movements}
      columns={columns}
      getRowId={(movement) => movement.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("movements.empty.title")}
      emptyDescription={t("movements.empty.description")}
    />
  );
}
