"use client";

import { DataTable, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import type { InventoryRecord } from "../types";
import styles from "./ops-tables.module.css";

export function InventoryTable({
  records,
  adjustStockAction,
}: {
  records: InventoryRecord[];
  adjustStockAction?: StatefulMutationAction;
}) {
  const t = useTranslations();
  const mutationLabels = {
    saving: t("common.actions.saving"),
    successTitle: t("mutations.successTitle"),
    errorTitle: t("mutations.errorTitle"),
    correlationId: t("mutations.correlationId"),
  };

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
    ...(adjustStockAction
      ? [
          {
            id: "adjust",
            header: t("inventory.columns.adjust"),
            meta: { headerLabel: t("inventory.columns.adjust"), priority: "medium" as const },
            cell: ({ row }: { row: { original: InventoryRecord } }) => (
              <MutationForm action={adjustStockAction} labels={mutationLabels} className={styles.actionsRow}>
                <>
                  <input type="hidden" name="organizationId" value={row.original.organizationId} />
                  <input type="hidden" name="countryId" value={row.original.countryId} />
                  <input type="hidden" name="countryCode" value={row.original.countryCode} />
                  <input type="hidden" name="warehouseId" value={row.original.warehouseId} />
                  <input type="hidden" name="productId" value={row.original.productId} />
                  <input type="hidden" name="variantId" value={row.original.variantId} />
                  <label className={styles.field}>
                    <span className={styles.label}>{t("inventory.adjust.type")}</span>
                    <select className={styles.input} name="type" defaultValue="ADJUSTMENT_IN">
                      <option value="ADJUSTMENT_IN">{t("inventory.adjust.typeIn")}</option>
                      <option value="ADJUSTMENT_OUT">{t("inventory.adjust.typeOut")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("inventory.adjust.quantity")}</span>
                    <input className={styles.input} type="number" name="quantity" required min={1} step={1} inputMode="numeric" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("inventory.adjust.reason")}</span>
                    <input className={styles.input} type="text" name="reason" maxLength={240} />
                  </label>
                  <SubmitButton pendingLabel={t("common.actions.saving")}>{t("inventory.adjust.submit")}</SubmitButton>
                </>
              </MutationForm>
            ),
          },
        ]
      : []),
  ];

  return (
    <AdminMutationBoundary>
      <DataTable
        aria-label={t("inventory.table.ariaLabel")}
        data={records}
        columns={columns}
        getRowId={(record) => record.id}
        responsiveStrategy="priority-columns"
        emptyTitle={t("inventory.empty.title")}
        emptyDescription={t("inventory.empty.description")}
      />
    </AdminMutationBoundary>
  );
}
