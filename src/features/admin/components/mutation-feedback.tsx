"use client";

import { useActionState, useEffect, useRef } from "react";
import type React from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Alert, Button, ToastProvider, useToast } from "@agrismartchain/noki-design-system";

import type {
  AdminMutationResult,
  MutationFeedbackLabels,
  StatefulMutationAction,
} from "@/features/admin/mutations";
import { idleMutationResult } from "@/features/admin/mutations";

import styles from "./mutation-feedback.module.css";

export function AdminMutationBoundary({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

export function MutationAlert({
  result,
  labels,
}: {
  result: AdminMutationResult;
  labels: Pick<MutationFeedbackLabels, "successTitle" | "errorTitle" | "correlationId">;
}) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result.status === "error") {
      alertRef.current?.focus();
    }
  }, [result]);

  if (result.status === "idle") {
    return null;
  }

  return (
    <Alert
      ref={alertRef}
      tabIndex={-1}
      tone={result.status === "success" ? "success" : "danger"}
      title={result.status === "success" ? labels.successTitle : labels.errorTitle}
    >
      {result.message ? <p className={styles.alertText}>{result.message}</p> : null}
      {result.correlationId ? (
        <p className={styles.alertMeta}>
          {labels.correlationId}: {result.correlationId}
        </p>
      ) : null}
    </Alert>
  );
}

export function FieldError({
  result,
  name,
}: {
  result: AdminMutationResult;
  name: string;
}) {
  const messages = result.fieldErrors?.[name];
  return messages && messages.length > 0 ? (
    <span className={styles.fieldError}>{messages.join(" ")}</span>
  ) : null;
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function MutationForm({
  action,
  children,
  className,
  labels,
}: {
  action: StatefulMutationAction;
  children: React.ReactNode | ((state: AdminMutationResult) => React.ReactNode);
  className?: string;
  labels: MutationFeedbackLabels;
}) {
  const [state, formAction] = useActionState(action, idleMutationResult);
  const router = useRouter();
  const lastRefreshSignature = useRef("");

  useMutationToast(state, labels);

  useEffect(() => {
    const signature = state.resultId ?? `${state.status}:${state.message ?? ""}:${state.correlationId ?? ""}`;
    if (state.status !== "success" || state.refresh !== true || signature === lastRefreshSignature.current) {
      return;
    }

    lastRefreshSignature.current = signature;
    router.refresh();
  }, [router, state]);

  return (
    <>
      <MutationAlert result={state} labels={labels} />
      <form action={formAction} className={className} data-mutation-form="true">
        {typeof children === "function" ? children(state) : children}
      </form>
    </>
  );
}

export function useMutationToast(
  result: AdminMutationResult,
  labels: Pick<MutationFeedbackLabels, "successTitle" | "errorTitle">,
) {
  const toast = useToast();
  const lastSignature = useRef("");

  useEffect(() => {
    const signature = result.resultId ?? `${result.status}:${result.message ?? ""}:${result.correlationId ?? ""}`;
    if (result.status === "idle" || signature === lastSignature.current) {
      return;
    }

    lastSignature.current = signature;
    toast.add({
      tone: result.status === "success" ? "success" : "danger",
      title: result.status === "success" ? labels.successTitle : labels.errorTitle,
      description: result.message,
    });
  }, [labels.errorTitle, labels.successTitle, result, toast]);
}
