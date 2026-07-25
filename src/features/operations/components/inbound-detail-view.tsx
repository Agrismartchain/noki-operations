"use client";

import {
  Button,
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
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AdminMutationBoundary, MutationForm, SubmitButton } from "@/features/admin/components/mutation-feedback";
import type { StatefulMutationAction } from "@/features/admin/mutations";

import { INBOUND_TONE } from "../tone-maps";
import type { InboundDetail, InboundLine } from "../types";
import styles from "./ops-tables.module.css";

export interface InboundDetailViewProps {
  shipment: InboundDetail;
  submitAction?: StatefulMutationAction;
  shipAction?: StatefulMutationAction;
  cancelAction?: StatefulMutationAction;
  receiveAction?: StatefulMutationAction;
}

function mutationLabels(t: ReturnType<typeof useTranslations>) {
  return {
    saving: t("common.actions.saving"),
    successTitle: t("mutations.successTitle"),
    errorTitle: t("mutations.errorTitle"),
    correlationId: t("mutations.correlationId"),
  };
}

interface ReceiveFormProps {
  shipment: InboundDetail;
  receivableLines: InboundLine[];
  receiveAction: StatefulMutationAction;
}

type LineQuantities = Record<string, { received: string; damaged: string }>;

function ReceiveForm({ shipment, receivableLines, receiveAction }: ReceiveFormProps) {
  const t = useTranslations();
  // Computed once per shipment (not on every render) so replaying the same submit doesn't mint a new idempotency key.
  const [idempotencyKey] = useState(() => `${shipment.id}-${crypto.randomUUID()}`);
  const [quantities, setQuantities] = useState<LineQuantities>({});
  const [phase, setPhase] = useState<"edit" | "confirm">("edit");

  function getValue(lineId: string, field: "received" | "damaged"): string {
    return quantities[lineId]?.[field] ?? "0";
  }

  function setValue(lineId: string, field: "received" | "damaged", value: string) {
    setQuantities((current) => ({
      ...current,
      [lineId]: { received: current[lineId]?.received ?? "0", damaged: current[lineId]?.damaged ?? "0", [field]: value },
    }));
  }

  const entries = receivableLines
    .map((line) => ({
      line,
      received: Math.max(0, Math.trunc(Number(getValue(line.id, "received")) || 0)),
      damaged: Math.max(0, Math.trunc(Number(getValue(line.id, "damaged")) || 0)),
    }))
    .filter((entry) => entry.received > 0);

  const hasInvalidLine = entries.some((entry) => entry.damaged > entry.received || entry.received > entry.line.expectedQuantity - entry.line.receivedQuantity);

  function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entries.length === 0 || hasInvalidLine) {
      return;
    }
    setPhase("confirm");
  }

  if (phase === "confirm") {
    return (
      <div className={styles.container}>
        <p>{t("receiving.confirm.description")}</p>
        <div className={styles.tableWrapper}>
          <table className={styles.miniTable}>
            <thead>
              <tr>
                <th>{t("inbound.lines.product")}</th>
                <th>{t("inbound.receive.receivedQuantity")}</th>
                <th>{t("inbound.receive.damagedQuantity")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(({ line, received, damaged }) => (
                <tr key={line.id}>
                  <td>
                    {line.productName} ({line.sku})
                  </td>
                  <td>{received}</td>
                  <td>{damaged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.actionsRow}>
          <Button type="button" variant="secondary" onClick={() => setPhase("edit")}>
            {t("receiving.confirm.back")}
          </Button>
          <MutationForm action={receiveAction} labels={mutationLabels(t)}>
            <>
              <input type="hidden" name="shipmentId" value={shipment.id} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
              {entries.map(({ line, received, damaged }) => (
                <span key={line.id}>
                  <input type="hidden" name="lineId" value={line.id} />
                  <input type="hidden" name={`received-${line.id}`} value={received} />
                  <input type="hidden" name={`damaged-${line.id}`} value={damaged} />
                </span>
              ))}
              <SubmitButton pendingLabel={t("common.actions.saving")}>{t("receiving.actions.confirmSubmit")}</SubmitButton>
            </>
          </MutationForm>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleReview} className={styles.container}>
      <div className={styles.fieldGrid}>
        {receivableLines.map((line) => {
          const remaining = line.expectedQuantity - line.receivedQuantity;
          const received = Number(getValue(line.id, "received")) || 0;
          const damaged = Number(getValue(line.id, "damaged")) || 0;
          const lineInvalid = damaged > received || received > remaining;
          return (
            <fieldset key={line.id} className={styles.fieldset}>
              <legend>
                {line.productName} ({line.sku})
              </legend>
              <span className={styles.remaining}>
                {t("inbound.receive.remaining", { count: remaining })}
              </span>
              <label className={styles.field}>
                <span className={styles.label}>{t("inbound.receive.receivedQuantity")}</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={remaining}
                  value={getValue(line.id, "received")}
                  onChange={(event) => setValue(line.id, "received", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("inbound.receive.damagedQuantity")}</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={getValue(line.id, "damaged")}
                  onChange={(event) => setValue(line.id, "damaged", event.target.value)}
                />
              </label>
              {lineInvalid ? <span className={styles.remaining}>{t("receiving.errors.invalidLine")}</span> : null}
            </fieldset>
          );
        })}
      </div>
      <div className={styles.actionsRow}>
        <Button type="submit" variant="primary" disabled={entries.length === 0 || hasInvalidLine}>
          {t("receiving.actions.review")}
        </Button>
      </div>
    </form>
  );
}

export function InboundDetailView({ shipment, submitAction, shipAction, cancelAction, receiveAction }: InboundDetailViewProps) {
  const t = useTranslations();
  const canSubmit = submitAction && shipment.status === "DRAFT";
  const canShip = shipAction && shipment.status === "READY";
  const canCancel = cancelAction && (shipment.status === "DRAFT" || shipment.status === "READY");
  const canReceive = receiveAction && ["SHIPPED", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(shipment.status);
  const receivableLines = shipment.lines.filter((line) => line.receivedQuantity < line.expectedQuantity);

  return (
    <AdminMutationBoundary>
      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>{t("inbound.detail.sections.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t("inbound.columns.reference")} value={shipment.reference} />
              <DetailItem
                label={t("inbound.columns.status")}
                value={<StatusChip tone={INBOUND_TONE[shipment.status]}>{t(`inbound.status.${shipment.status}`)}</StatusChip>}
              />
              <DetailItem label={t("inbound.detail.seller")} value={shipment.sellerName} />
              <DetailItem label={t("inbound.columns.warehouse")} value={shipment.destinationWarehouseName} />
              <DetailItem label={t("inbound.columns.country")} value={shipment.countryCode} />
              {shipment.supplierLabel ? <DetailItem label={t("inbound.detail.supplier")} value={shipment.supplierLabel} /> : null}
            </DetailList>
          </CardContent>
        </Card>

        {canSubmit || canShip || canCancel ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("inbound.detail.sections.actions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.actionsRow}>
                {canSubmit ? (
                  <MutationForm action={submitAction} labels={mutationLabels(t)}>
                    <>
                      <input type="hidden" name="shipmentId" value={shipment.id} />
                      <SubmitButton pendingLabel={t("common.actions.saving")}>{t("inbound.actions.submit")}</SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
                {canShip ? (
                  <MutationForm action={shipAction} labels={mutationLabels(t)}>
                    <>
                      <input type="hidden" name="shipmentId" value={shipment.id} />
                      <SubmitButton pendingLabel={t("common.actions.saving")}>{t("inbound.actions.ship")}</SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
                {canCancel ? (
                  <MutationForm action={cancelAction} labels={mutationLabels(t)}>
                    <>
                      <input type="hidden" name="shipmentId" value={shipment.id} />
                      <SubmitButton pendingLabel={t("common.actions.saving")} variant="secondary">
                        {t("inbound.actions.cancel")}
                      </SubmitButton>
                    </>
                  </MutationForm>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("inbound.detail.sections.lines")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.tableWrapper}>
              <Table aria-label={t("inbound.detail.sections.lines")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inbound.lines.product")}</TableHead>
                    <TableHead align="end">{t("inbound.lines.expected")}</TableHead>
                    <TableHead align="end">{t("inbound.lines.received")}</TableHead>
                    <TableHead align="end">{t("inbound.lines.damaged")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className={styles.stack}>
                          <span className={styles.primary}>{line.productName}</span>
                          <span className={styles.secondary}>{line.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell align="end">{line.expectedQuantity}</TableCell>
                      <TableCell align="end">{line.receivedQuantity}</TableCell>
                      <TableCell align="end">{line.damagedQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {canReceive && receivableLines.length > 0 ? (
          <Card className={styles.full}>
            <CardHeader>
              <CardTitle>{t("inbound.detail.sections.receive")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiveForm shipment={shipment} receivableLines={receivableLines} receiveAction={receiveAction} />
            </CardContent>
          </Card>
        ) : null}

        {shipment.receipts.length > 0 ? (
          <Card className={styles.full}>
            <CardHeader>
              <CardTitle>{t("inbound.detail.sections.receipts")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                {shipment.receipts.map((receipt) => (
                  <DetailItem
                    key={receipt.id}
                    label={new Date(receipt.postedAt).toLocaleString()}
                    value={`${receipt.status} (${receipt.linesCount} ${t("inbound.lines.product")})`}
                  />
                ))}
              </DetailList>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminMutationBoundary>
  );
}
