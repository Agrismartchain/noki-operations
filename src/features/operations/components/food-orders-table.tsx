"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { FOOD_ORDER_TONE } from "../tone-maps";
import type { FoodOrderRecord } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function FoodOrdersTable({ orders }: { orders: FoodOrderRecord[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<FoodOrderRecord>[] = [
    {
      accessorKey: "orderNumber",
      header: t("food.columns.order"),
      meta: { headerLabel: t("food.columns.order"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.orderNumber}</span>
          <span className={styles.secondary}>{row.original.restaurantBrandName}</span>
        </div>
      ),
    },
    {
      accessorKey: "establishmentName",
      header: t("food.columns.establishment"),
      meta: { headerLabel: t("food.columns.establishment"), priority: "medium" },
      cell: ({ row }) => row.original.establishmentName,
    },
    {
      accessorKey: "status",
      header: t("food.columns.status"),
      meta: { headerLabel: t("food.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={FOOD_ORDER_TONE[row.original.status]}>{t(`food.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "deliveryShipmentStatus",
      header: t("food.columns.delivery"),
      meta: { headerLabel: t("food.columns.delivery"), priority: "medium" },
      cell: ({ row }) =>
        row.original.deliveryShipmentStatus
          ? t(`shipping.status.${row.original.deliveryShipmentStatus}`)
          : t("food.noShipment"),
    },
    {
      accessorKey: "totalAmount",
      header: t("food.columns.total"),
      meta: { headerLabel: t("food.columns.total"), priority: "low", nowrap: true },
      cell: ({ row }) => `${row.original.totalAmount} ${row.original.currencyCode}`.trim(),
    },
    {
      accessorKey: "itemsCount",
      header: t("food.columns.items"),
      meta: { headerLabel: t("food.columns.items"), priority: "low" },
      cell: ({ row }) => row.original.itemsCount,
    },
    {
      accessorKey: "createdAt",
      header: t("food.columns.createdAt"),
      meta: { headerLabel: t("food.columns.createdAt"), priority: "low", nowrap: true },
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("food.table.ariaLabel")}
      data={orders}
      columns={columns}
      getRowId={(order) => order.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("food.empty.title")}
      emptyDescription={t("food.empty.description")}
      rowActionsLabel={t("food.columns.actions")}
      rowActions={(row) => (
        <Link href={`/food/${row.original.id}`} className={styles.rowAction}>
          {t("food.actions.view")}
        </Link>
      )}
    />
  );
}
