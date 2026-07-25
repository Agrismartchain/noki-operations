"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import type { InboundReceiptRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ReceiptsTable({ receipts }: { receipts: InboundReceiptRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<InboundReceiptRecord>[] = [
    {
      accessorKey: "shipmentReference",
      header: t("receiving.columns.shipmentReference"),
      meta: { headerLabel: t("receiving.columns.shipmentReference"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.shipmentReference}</span>
          <span className={styles.secondary}>{row.original.sellerName}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("receiving.columns.warehouse"),
      meta: { headerLabel: t("receiving.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "postedAt",
      header: t("receiving.columns.postedAt"),
      meta: { headerLabel: t("receiving.columns.postedAt"), priority: "medium", nowrap: true },
      cell: ({ row }) => formatDateTime(row.original.postedAt),
    },
    {
      accessorKey: "receivedQuantity",
      header: t("receiving.columns.receivedQuantity"),
      meta: { headerLabel: t("receiving.columns.receivedQuantity"), numeric: true, priority: "high" },
      cell: ({ row }) => row.original.receivedQuantity,
    },
    {
      accessorKey: "damagedQuantity",
      header: t("receiving.columns.damagedQuantity"),
      meta: { headerLabel: t("receiving.columns.damagedQuantity"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.damagedQuantity,
    },
    {
      accessorKey: "discrepancyQuantity",
      header: t("receiving.columns.discrepancyQuantity"),
      meta: { headerLabel: t("receiving.columns.discrepancyQuantity"), numeric: true, priority: "medium" },
      cell: ({ row }) =>
        row.original.discrepancyQuantity > 0 ? (
          <StatusChip tone="warning">{row.original.discrepancyQuantity}</StatusChip>
        ) : (
          row.original.discrepancyQuantity
        ),
    },
  ];

  return (
    <DataTable
      aria-label={t("receiving.table.ariaLabel")}
      data={receipts}
      columns={columns}
      getRowId={(receipt) => receipt.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("receiving.empty.title")}
      emptyDescription={t("receiving.empty.description")}
    />
  );
}
