"use client";

import { DataTable, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import type { InventoryRecord } from "../types";
import styles from "./ops-tables.module.css";

export function InventoryTable({ records }: { records: InventoryRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<InventoryRecord>[] = [
    {
      accessorKey: "productName",
      header: t("inventory.columns.product"),
      meta: { headerLabel: t("inventory.columns.product"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.productName}</span>
          <span className={styles.secondary}>{row.original.sku}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("inventory.columns.warehouse"),
      meta: { headerLabel: t("inventory.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName,
    },
    {
      accessorKey: "sellerName",
      header: t("inventory.columns.seller"),
      meta: { headerLabel: t("inventory.columns.seller"), priority: "low" },
      cell: ({ row }) => row.original.sellerName,
    },
    {
      accessorKey: "onHandQuantity",
      header: t("inventory.columns.onHand"),
      meta: { headerLabel: t("inventory.columns.onHand"), numeric: true, priority: "high" },
      cell: ({ row }) => row.original.onHandQuantity,
    },
    {
      accessorKey: "availableQuantity",
      header: t("inventory.columns.available"),
      meta: { headerLabel: t("inventory.columns.available"), numeric: true, priority: "medium" },
      cell: ({ row }) => row.original.availableQuantity,
    },
    {
      accessorKey: "reservedQuantity",
      header: t("inventory.columns.reserved"),
      meta: { headerLabel: t("inventory.columns.reserved"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.reservedQuantity,
    },
    {
      accessorKey: "defectiveQuantity",
      header: t("inventory.columns.defective"),
      meta: { headerLabel: t("inventory.columns.defective"), numeric: true, priority: "low" },
      cell: ({ row }) => row.original.defectiveQuantity,
    },
  ];

  return (
    <DataTable
      aria-label={t("inventory.table.ariaLabel")}
      data={records}
      columns={columns}
      getRowId={(record) => record.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("inventory.empty.title")}
      emptyDescription={t("inventory.empty.description")}
    />
  );
}
