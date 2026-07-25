"use client";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailItem,
  DetailList,
  Input,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskDetail } from "../types";
import styles from "./ops-tables.module.css";

export interface PackingDetailViewProps {
  task: FulfillmentTaskDetail;
  completePackingAction?: StatefulMutationAction;
}

function mutationLabels(t: ReturnType<typeof useTranslations>) {
  return {
    saving: t("common.actions.saving"),
    successTitle: t("mutations.successTitle"),
    errorTitle: t("mutations.errorTitle"),
    correlationId: t("mutations.correlationId"),
  };
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function PackingDetailView({ task, completePackingAction }: PackingDetailViewProps) {
  const t = useTranslations();
  // The backend guard (fulfillment-task.service.ts completePacking) requires
  // status === 'PICKING' AND pickingCompletedAt truthy. Both fields come
  // straight from GET /fulfillment/tasks/{id}, so this reflects real state
  // rather than a fabricated local check.
  const readyToPack = task.status === "PICKING" && Boolean(task.pickingCompletedAt);
  const canCompletePacking = Boolean(completePackingAction) && readyToPack;

  return (
    <AdminMutationBoundary>
      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>{t("packing.detail.sections.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t("packing.detail.taskId")} value={shortId(task.id)} />
              <DetailItem
                label={t("packing.columns.status")}
                value={<StatusChip tone={FULFILLMENT_TONE[task.status]}>{t(`packing.status.${task.status}`)}</StatusChip>}
              />
              <DetailItem label={t("packing.detail.orderStatus")} value={task.orderStatus} />
              {task.pickingStartedAt ? <DetailItem label={t("packing.detail.pickingStartedAt")} value={new Date(task.pickingStartedAt).toLocaleString()} /> : null}
              {task.pickingCompletedAt ? (
                <DetailItem label={t("packing.detail.pickingCompletedAt")} value={new Date(task.pickingCompletedAt).toLocaleString()} />
              ) : null}
              {task.packedAt ? <DetailItem label={t("packing.detail.packedAt")} value={new Date(task.packedAt).toLocaleString()} /> : null}
              {task.packageCount !== null ? <DetailItem label={t("packing.detail.packageCount")} value={String(task.packageCount)} /> : null}
              {task.weightKg !== null ? <DetailItem label={t("packing.detail.weightKg")} value={`${task.weightKg} kg`} /> : null}
              {task.packingNotes ? <DetailItem label={t("packing.detail.notesLabel")} value={task.packingNotes} /> : null}
            </DetailList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("packing.detail.sections.actions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!readyToPack ? <Alert tone="warning" title={t("packing.detail.notReadyTitle")}>{t("packing.detail.notReadyDescription")}</Alert> : null}
            {canCompletePacking ? (
              <MutationForm action={completePackingAction!} labels={mutationLabels(t)} className={styles.container}>
                <>
                  <input type="hidden" name="taskId" value={task.id} />
                  <label className={styles.field}>
                    <span className={styles.label}>{t("packing.detail.packageCount")} *</span>
                    <Input type="number" name="packageCount" required min={1} step={1} inputMode="numeric" placeholder={t("packing.detail.packageCountPlaceholder")} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("packing.detail.weightKg")}</span>
                    <Input type="number" name="weightKg" min={0.001} step={0.001} inputMode="decimal" placeholder={t("packing.detail.weightKgPlaceholder")} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("packing.detail.notesLabel")}</span>
                    <Textarea name="notes" maxLength={1000} rows={3} placeholder={t("packing.detail.notesPlaceholder")} />
                  </label>
                  <div className={styles.actionsRow}>
                    <SubmitButton pendingLabel={t("common.actions.saving")}>{t("packing.actions.completePacking")}</SubmitButton>
                  </div>
                </>
              </MutationForm>
            ) : null}
          </CardContent>
        </Card>

        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("packing.detail.sections.lines")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.secondary}>{t("packing.detail.linesNote")}</p>
            <div className={styles.tableWrapper}>
              <Table aria-label={t("packing.detail.sections.lines")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("packing.detail.lines.product")}</TableHead>
                    <TableHead>{t("packing.detail.lines.variant")}</TableHead>
                    <TableHead align="end">{t("packing.detail.lines.quantity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {task.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{shortId(line.productId)}</TableCell>
                      <TableCell>{shortId(line.variantId)}</TableCell>
                      <TableCell align="end">{line.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminMutationBoundary>
  );
}
