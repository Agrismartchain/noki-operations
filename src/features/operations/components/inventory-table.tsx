"use client";

import {
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DataTableColumn,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useCallback, useState, useSyncExternalStore } from "react";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { MutationFeedbackLabels, StatefulMutationAction } from "@/features/admin/mutations";

import type { InventoryRecord } from "../types";
import styles from "./ops-tables.module.css";

/**
 * The shared table hides medium-priority columns at <= 767px (design system rule), which used to hide the inline
 * "Ajuster" form on phones, and the inline form (three stacked fields + button) overflows the table on narrow laptops.
 * Up to 1279px the same real form is therefore offered from a per-row action that opens a dialog; from 1280px the inline
 * column is unchanged.
 */
const COMPACT_QUERY = "(max-width: 1279px)";

function subscribeCompact(onChange: () => void) {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useIsCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}

/** The adjustment fields: identical in the inline column (desktop/tablet) and in the mobile dialog. */
function AdjustStockFields({ record }: { record: InventoryRecord }) {
  const t = useTranslations();
  return (
    <>
      <input type="hidden" name="organizationId" value={record.organizationId} />
      <input type="hidden" name="countryId" value={record.countryId} />
      <input type="hidden" name="countryCode" value={record.countryCode} />
      <input type="hidden" name="warehouseId" value={record.warehouseId} />
      <input type="hidden" name="productId" value={record.productId} />
      <input type="hidden" name="variantId" value={record.variantId} />
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
  );
}

function AdjustStockDialogAction({
  record,
  action,
  labels,
}: {
  record: InventoryRecord;
  action: StatefulMutationAction;
  labels: MutationFeedbackLabels;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        aria-label={t("inventory.adjust.openLabel", { product: record.productName })}
        onClick={() => setOpen(true)}
      >
        {t("inventory.adjust.open")}
      </Button>
      <Dialog isOpen={open} onOpenChange={setOpen} closeLabel={t("inventory.adjust.close")}>
        <DialogHeader>
          <DialogTitle>{t("inventory.adjust.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("inventory.adjust.dialogDescription", { product: record.productName, sku: record.sku, warehouse: record.warehouseName })}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <MutationForm action={action} labels={labels} className={styles.dialogForm} onSuccess={close}>
            <AdjustStockFields record={record} />
          </MutationForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InventoryTable({
  records,
  adjustStockAction,
}: {
  records: InventoryRecord[];
  adjustStockAction?: StatefulMutationAction;
}) {
  const t = useTranslations();
  const compact = useIsCompactViewport();
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
    ...(adjustStockAction && !compact
      ? [
          {
            id: "adjust",
            header: t("inventory.columns.adjust"),
            meta: { headerLabel: t("inventory.columns.adjust"), priority: "medium" as const },
            cell: ({ row }: { row: { original: InventoryRecord } }) => (
              <MutationForm action={adjustStockAction} labels={mutationLabels} className={styles.actionsRow}>
                <AdjustStockFields record={row.original} />
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
        rowActionsLabel={t("inventory.columns.adjust")}
        rowActions={
          adjustStockAction && compact
            ? (row) => <AdjustStockDialogAction record={row.original} action={adjustStockAction} labels={mutationLabels} />
            : undefined
        }
        emptyTitle={t("inventory.empty.title")}
        emptyDescription={t("inventory.empty.description")}
      />
    </AdminMutationBoundary>
  );
}
