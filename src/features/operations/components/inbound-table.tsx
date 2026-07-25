"use client";

import { DataTable, StatusChip, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { INBOUND_TONE } from "../tone-maps";
import type { InboundListItem } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function InboundTable({ shipments }: { shipments: InboundListItem[] }) {
  const t = useTranslations();

  const columns: DataTableColumn<InboundListItem>[] = [
    {
      accessorKey: "reference",
      header: t("inbound.columns.reference"),
      meta: { headerLabel: t("inbound.columns.reference"), priority: "high" },
      cell: ({ row }) => (
        <div className={styles.stack}>
          <span className={styles.primary}>{row.original.reference}</span>
          <span className={styles.secondary}>{row.original.sellerName}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("inbound.columns.status"),
      meta: { headerLabel: t("inbound.columns.status"), priority: "high" },
      cell: ({ row }) => <StatusChip tone={INBOUND_TONE[row.original.status]}>{t(`inbound.status.${row.original.status}`)}</StatusChip>,
    },
    {
      accessorKey: "destinationWarehouseName",
      header: t("inbound.columns.warehouse"),
      meta: { headerLabel: t("inbound.columns.warehouse"), priority: "medium" },
      cell: ({ row }) => row.original.destinationWarehouseName,
    },
    {
      accessorKey: "countryCode",
      header: t("inbound.columns.country"),
      meta: { headerLabel: t("inbound.columns.country"), priority: "low" },
      cell: ({ row }) => row.original.countryCode,
    },
    {
      accessorKey: "linesCount",
      header: t("inbound.columns.lines"),
      meta: { headerLabel: t("inbound.columns.lines"), numeric: true, priority: "medium" },
      cell: ({ row }) => row.original.linesCount,
    },
    {
      accessorKey: "expectedArrivalAt",
      header: t("inbound.columns.expectedArrival"),
      meta: { headerLabel: t("inbound.columns.expectedArrival"), priority: "low", nowrap: true },
      cell: ({ row }) => formatDate(row.original.expectedArrivalAt),
    },
  ];

  return (
    <DataTable
      aria-label={t("inbound.table.ariaLabel")}
      data={shipments}
      columns={columns}
      getRowId={(shipment) => shipment.id}
      responsiveStrategy="priority-columns"
      emptyTitle={t("inbound.empty.title")}
      emptyDescription={t("inbound.empty.description")}
      rowActionsLabel={t("inbound.columns.actions")}
      rowActions={(row) => (
        <Link href={`/inbound/${row.original.id}`} className={styles.rowAction}>
          {t("inbound.actions.view")}
        </Link>
      )}
    />
  );
}
