"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailItem,
  DetailList,
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
import { useState } from "react";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskDetail } from "../types";
import styles from "./ops-tables.module.css";

export interface QcDetailViewProps {
  task: FulfillmentTaskDetail;
  qualityCheckAction?: StatefulMutationAction;
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

const QC_ELIGIBLE_STATUSES = ["PACKED", "QC_PENDING", "QC_FAILED"];

function QcForm({ task, qualityCheckAction }: { task: FulfillmentTaskDetail; qualityCheckAction: StatefulMutationAction }) {
  const t = useTranslations();
  const [status, setStatus] = useState<"PASSED" | "FAILED">("PASSED");
  const [reason, setReason] = useState("");
  const reasonMissing = status === "FAILED" && reason.trim().length === 0;

  return (
    <MutationForm action={qualityCheckAction} labels={mutationLabels(t)} className={styles.container}>
      <>
        <input type="hidden" name="taskId" value={task.id} />
        <fieldset className={styles.fieldset}>
          <legend>{t("qc.detail.statusLegend")}</legend>
          <label className={styles.field}>
            <span className={styles.label}>
              <input type="radio" name="status" value="PASSED" checked={status === "PASSED"} onChange={() => setStatus("PASSED")} />
              {" "}
              {t("qc.detail.pass")}
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              <input type="radio" name="status" value="FAILED" checked={status === "FAILED"} onChange={() => setStatus("FAILED")} />
              {" "}
              {t("qc.detail.fail")}
            </span>
          </label>
        </fieldset>
        <label className={styles.field}>
          <span className={styles.label}>
            {t("qc.detail.reasonLabel")}
            {status === "FAILED" ? " *" : ""}
          </span>
          <Textarea
            name="reason"
            maxLength={160}
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required={status === "FAILED"}
            placeholder={t("qc.detail.reasonPlaceholder")}
          />
          {reasonMissing ? <span className={styles.remaining}>{t("qc.detail.reasonRequired")}</span> : null}
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("qc.detail.notesLabel")}</span>
          <Textarea name="notes" maxLength={1000} rows={3} placeholder={t("qc.detail.notesPlaceholder")} />
        </label>
        <div className={styles.actionsRow}>
          <SubmitButton pendingLabel={t("common.actions.saving")} variant={status === "FAILED" ? "secondary" : "primary"}>
            {status === "FAILED" ? t("qc.actions.submitFail") : t("qc.actions.submitPass")}
          </SubmitButton>
        </div>
      </>
    </MutationForm>
  );
}

export function QcDetailView({ task, qualityCheckAction }: QcDetailViewProps) {
  const t = useTranslations();
  const canRunQc = Boolean(qualityCheckAction) && QC_ELIGIBLE_STATUSES.includes(task.status);

  return (
    <AdminMutationBoundary>
      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>{t("qc.detail.sections.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t("qc.detail.taskId")} value={shortId(task.id)} />
              <DetailItem
                label={t("qc.columns.status")}
                value={<StatusChip tone={FULFILLMENT_TONE[task.status]}>{t(`qc.status.${task.status}`)}</StatusChip>}
              />
              <DetailItem label={t("qc.detail.orderStatus")} value={task.orderStatus} />
              {task.packedAt ? <DetailItem label={t("qc.columns.packedAt")} value={new Date(task.packedAt).toLocaleString()} /> : null}
            </DetailList>
          </CardContent>
        </Card>

        {canRunQc ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("qc.detail.sections.check")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QcForm task={task} qualityCheckAction={qualityCheckAction!} />
            </CardContent>
          </Card>
        ) : null}

        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("qc.detail.sections.lines")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.secondary}>{t("qc.detail.linesNote")}</p>
            <div className={styles.tableWrapper}>
              <Table aria-label={t("qc.detail.sections.lines")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("qc.detail.lines.product")}</TableHead>
                    <TableHead>{t("qc.detail.lines.variant")}</TableHead>
                    <TableHead align="end">{t("qc.detail.lines.quantity")}</TableHead>
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
