"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { DELIVERY_SHIPMENT_TONE } from "../tone-maps";
import type { CommerceShippingRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ShipmentsTable({ shipments }: { shipments: CommerceShippingRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<CommerceShippingRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("shipping.columns.order"),
      meta: { headerLabel: t("shipping.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber ?? row.original.id}</span>
          <span className={styles.secondary}>{row.original.sellerName ?? "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: t("shipping.columns.warehouse"),
      meta: { headerLabel: t("shipping.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.warehouseName ?? "-",
    },
    {
      accessorKey: "shipmentStatus",
      header: t("shipping.columns.status"),
      meta: { headerLabel: t("shipping.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={DELIVERY_SHIPMENT_TONE[row.original.shipmentStatus]}>{t(`shipping.status.${row.original.shipmentStatus}`)}</StatusChip>,
    },
    {
      accessorKey: "driverName",
      header: t("shipping.columns.driver"),
      meta: { headerLabel: t("shipping.columns.driver"), priority: "medium" },
      cell: ({ row }) => row.original.driverName ?? t("shipping.unassigned"),
    },
    {
      accessorKey: "codAmount",
      header: t("shipping.columns.cod"),
      meta: { headerLabel: t("shipping.columns.cod"), priority: "low", nowrap: true },
      cell: ({ row }) => `${row.original.codAmount} ${row.original.currencyCode ?? ""}`.trim(),
    },
    {
      accessorKey: "qcStatus",
      header: t("shipping.columns.qc"),
      meta: { headerLabel: t("shipping.columns.qc"), priority: "low" },
      cell: ({ row }) => (row.original.qcStatus ? t(`shipping.qcStatus.${row.original.qcStatus}`) : "-"),
    },
    {
      accessorKey: "updatedAt",
      header: t("shipping.columns.updatedAt"),
      meta: { headerLabel: t("shipping.columns.updatedAt"), priority: "low", nowrap: true },
      cell: ({ row }) => formatDate(row.original.updatedAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("shipping.table.ariaLabel")}
      data={shipments}
      columns={columns}
      getRowId={(shipment) => shipment.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("shipping.empty.title")}
      emptyDescription={t("shipping.empty.description")}
      rowActionsLabel={t("shipping.columns.actions")}
      rowActions={(row) => (
        <Link href={`/shipping/${row.original.id}`} className={styles.rowAction}>
          {t("shipping.actions.view")}
        </Link>
      )}
    />
  );
}
