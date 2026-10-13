"use client";

import { Alert, Button, Field, Input, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Shown by the mutation feedback when the API answers STEP_UP_REQUIRED: the action is sensitive and the session has
 * no recent second-factor proof. The user proves it once (bounded window) and simply repeats the action; the form
 * state the user typed stays untouched.
 */
export function StepUpPrompt() {
  const t = useTranslations("auth.stepUp");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorKey(null);
    try {
      const isRecovery = !/^\d{6}$/.test(code.replace(/\s+/g, ""));
      const response = await fetch("/api/auth/mfa/step-up", {
        method: "POST",
        referrer: window.location.href,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRecovery ? { recoveryCode: code.trim() } : { code: code.replace(/\s+/g, "") }),
      });
      if (response.ok) {
        setDone(true);
        setCode("");
      } else {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(body?.code === "MFA_LOCKED" || body?.code === "RATE_LIMITED" ? "locked" : "invalid");
      }
    } catch {
      setErrorKey("invalid");
    }
    setPending(false);
  }

  if (done) {
    return (
      <Alert tone="success" title={t("doneTitle")}>
        {t("doneText")}
      </Alert>
    );
  }

  return (
    <Alert tone="warning" title={t("title")}>
      <form onSubmit={submit} noValidate>
        <Stack gap="sm">
          <p>{t("text")}</p>
          <Field id="step-up-code" label={t("codeLabel")}>
            <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={20} disabled={pending} />
          </Field>
          {errorKey ? <p role="alert">{t(`errors.${errorKey}`)}</p> : null}
          <Button type="submit" variant="primary" loading={pending} disabled={pending || code.trim().length < 6}>
            {t("submit")}
          </Button>
        </Stack>
      </form>
    </Alert>
  );
}
