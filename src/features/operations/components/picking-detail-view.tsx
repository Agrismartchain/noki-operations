"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailItem,
  DetailList,
  Field,
  Input,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import { FULFILLMENT_TONE } from "../tone-maps";
import type { FulfillmentTaskDetail } from "../types";
import styles from "./ops-tables.module.css";

export interface PickingDetailViewProps {
  task: FulfillmentTaskDetail;
  assignAction?: StatefulMutationAction;
  startPickingAction?: StatefulMutationAction;
  completePickingAction?: StatefulMutationAction;
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

export function PickingDetailView({ task, assignAction, startPickingAction, completePickingAction }: PickingDetailViewProps) {
  const t = useTranslations();
  const canAssign = Boolean(assignAction) && ["OPEN", "ASSIGNED", "PICKING"].includes(task.status);
  const canStartPicking = Boolean(startPickingAction) && ["OPEN", "ASSIGNED"].includes(task.status);
  const canCompletePicking = Boolean(completePickingAction) && task.status === "PICKING" && !task.pickingCompletedAt;

  return (
    <AdminMutationBoundary>
      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>{t("picking.detail.sections.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t("picking.detail.taskId")} value={shortId(task.id)} />
              <DetailItem
                label={t("picking.columns.status")}
                value={<StatusChip tone={FULFILLMENT_TONE[task.status]}>{t(`picking.status.${task.status}`)}</StatusChip>}
              />
              <DetailItem label={t("picking.detail.orderStatus")} value={task.orderStatus} />
              <DetailItem label={t("picking.detail.assignedActorId")} value={task.assignedActorId ? shortId(task.assignedActorId) : t("picking.unassigned")} />
              {task.pickingStartedAt ? <DetailItem label={t("picking.detail.pickingStartedAt")} value={new Date(task.pickingStartedAt).toLocaleString()} /> : null}
              {task.pickingCompletedAt ? (
                <DetailItem label={t("picking.detail.pickingCompletedAt")} value={new Date(task.pickingCompletedAt).toLocaleString()} />
              ) : null}
            </DetailList>
          </CardContent>
        </Card>

        {canAssign || canStartPicking || canCompletePicking ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("picking.detail.sections.actions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.container}>
                {canAssign ? (
                  <MutationForm action={assignAction!} labels={mutationLabels(t)} className={styles.actionsRow}>
                    <>
                      <input type="hidden" name="taskId" value={task.id} />
                      <Field label={t("picking.detail.assignInputLabel")} id="assignedActorId" description={t("picking.detail.assignInputPlaceholder")}>
                        <Input name="assignedActorId" required />
                      </Field>
                      <SubmitButton pendingLabel={t("common.actions.saving")} variant="secondary">
                        {t("picking.actions.assign")}
                      </SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
                {canStartPicking ? (
                  <MutationForm action={startPickingAction!} labels={mutationLabels(t)}>
                    <>
                      <input type="hidden" name="taskId" value={task.id} />
                      <SubmitButton pendingLabel={t("common.actions.saving")}>{t("picking.actions.startPicking")}</SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
                {canCompletePicking ? (
                  <MutationForm action={completePickingAction!} labels={mutationLabels(t)}>
                    <>
                      <input type="hidden" name="taskId" value={task.id} />
                      <SubmitButton pendingLabel={t("common.actions.saving")}>{t("picking.actions.completePicking")}</SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("picking.detail.sections.lines")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.secondary}>{t("picking.detail.linesNote")}</p>
            <div className={styles.tableWrapper}>
              <Table aria-label={t("picking.detail.sections.lines")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("picking.detail.lines.product")}</TableHead>
                    <TableHead>{t("picking.detail.lines.variant")}</TableHead>
                    <TableHead align="end">{t("picking.detail.lines.quantity")}</TableHead>
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
