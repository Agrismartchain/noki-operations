"use client";

import { Alert, Button, Field, FormActions, Input, Stack } from "@agrismartchain/noki-design-system";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import styles from "./mfa-steps.module.css";

const ERROR_KEYS: Record<string, string> = {
  MFA_CODE_INVALID: "auth.mfa.errors.invalidCode",
  MFA_LOCKED: "auth.mfa.errors.locked",
  MFA_CHALLENGE_EXPIRED: "auth.mfa.errors.expired",
  RATE_LIMITED: "auth.mfa.errors.locked",
  SERVICE_UNAVAILABLE: "auth.login.errors.serviceUnavailable",
  TIMEOUT: "auth.login.errors.timeout",
};

function errorKey(code: string): string {
  return ERROR_KEYS[code] ?? "auth.mfa.errors.unexpected";
}

async function postJson(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetch(path, {
    method: "POST",
    referrer: window.location.href,
    headers: { "Content-Type": "application/json", "Accept-Language": document.documentElement.lang },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

export interface MfaStepProps {
  /** Called when the session cookies have been set; the page can proceed. */
  onSuccess: () => void;
  /** Back to the password step (e.g. when the sign-in step expired). */
  onRestart: () => void;
}

/** Second step of sign-in for an account that already has two-factor authentication. */
export function MfaVerifyStep({ onSuccess, onRestart }: MfaStepProps) {
  const t = useTranslations();
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), [useRecovery]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    try {
      const result = await postJson("/api/auth/mfa/verify", useRecovery ? { recoveryCode: value.trim() } : { code: value.replace(/\s+/g, "") });
      if (result.ok) {
        onSuccess();
        return;
      }
      const code = typeof result.data.code === "string" ? result.data.code : "UNEXPECTED_ERROR";
      if (code === "MFA_CHALLENGE_EXPIRED") {
        onRestart();
        return;
      }
      setErrorCode(code);
    } catch {
      setErrorCode("SERVICE_UNAVAILABLE");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <p className={styles.hint}>{t(useRecovery ? "auth.mfa.verify.recoveryHint" : "auth.mfa.verify.hint")}</p>
        <Field id="mfa-code" label={t(useRecovery ? "auth.mfa.verify.recoveryLabel" : "auth.mfa.verify.codeLabel")}>
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 20 : 7}
            disabled={pending}
          />
        </Field>
        {errorCode ? (
          <Alert tone="danger" title={t("auth.mfa.errors.title")}>
            {t(errorKey(errorCode))}
          </Alert>
        ) : null}
        <FormActions align="end">
          <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending || value.trim().length < 6}>
            {t("auth.mfa.verify.submit")}
          </Button>
        </FormActions>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setUseRecovery((current) => !current);
            setValue("");
            setErrorCode(null);
          }}
        >
          {t(useRecovery ? "auth.mfa.verify.useAuthenticator" : "auth.mfa.verify.useRecovery")}
        </button>
      </Stack>
    </form>
  );
}

/** Mandatory setup for a privileged account without a second factor: QR code, first code, then recovery codes. */
export function MfaEnrollStep({ onSuccess, onRestart }: MfaStepProps) {
  const t = useTranslations();
  const [phase, setPhase] = useState<"loading" | "scan" | "codes">("loading");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await postJson("/api/auth/mfa/enroll/start");
        if (!result.ok) {
          const failure = typeof result.data.code === "string" ? result.data.code : "UNEXPECTED_ERROR";
          if (failure === "MFA_CHALLENGE_EXPIRED") onRestart();
          else setErrorCode(failure);
          return;
        }
        const uri = String(result.data.otpauthUri);
        setSecret(String(result.data.secretBase32));
        setQr(await QRCode.toDataURL(uri, { margin: 1, width: 352, errorCorrectionLevel: "M" }));
        setPhase("scan");
      } catch {
        setErrorCode("SERVICE_UNAVAILABLE");
      }
    })();
    return () => {
      // Never keep the secret around once the step is gone.
      setSecret("");
      setQr("");
    };
  }, [onRestart]);

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    try {
      const result = await postJson("/api/auth/mfa/enroll/confirm", { code: code.replace(/\s+/g, "") });
      if (result.ok) {
        setRecoveryCodes(Array.isArray(result.data.recoveryCodes) ? (result.data.recoveryCodes as string[]) : []);
        setSecret("");
        setQr("");
        setPhase("codes");
        setPending(false);
        return;
      }
      const failure = typeof result.data.code === "string" ? result.data.code : "UNEXPECTED_ERROR";
      if (failure === "MFA_CHALLENGE_EXPIRED") {
        onRestart();
        return;
      }
      setErrorCode(failure);
    } catch {
      setErrorCode("SERVICE_UNAVAILABLE");
    }
    setPending(false);
  }

  function downloadCodes() {
    const blob = new Blob([`${t("auth.mfa.enroll.fileHeader")}\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "noki-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "codes") {
    return (
      <Stack gap="md">
        <Alert tone="warning" title={t("auth.mfa.enroll.codesTitle")}>
          {t("auth.mfa.enroll.codesWarning")}
        </Alert>
        <ul className={styles.codes} aria-label={t("auth.mfa.enroll.codesTitle")} data-testid="recovery-codes">
          {recoveryCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Stack gap="xs">
          <Button type="button" variant="secondary" onClick={downloadCodes}>
            {t("auth.mfa.enroll.download")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void navigator.clipboard?.writeText(recoveryCodes.join("\n"))}>
            {t("auth.mfa.enroll.copy")}
          </Button>
        </Stack>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
          <span>{t("auth.mfa.enroll.savedConfirm")}</span>
        </label>
        <FormActions align="end">
          <Button type="button" variant="primary" fullWidth disabled={!saved} onClick={onSuccess}>
            {t("auth.mfa.enroll.continue")}
          </Button>
        </FormActions>
      </Stack>
    );
  }

  return (
    <form onSubmit={confirm} noValidate>
      <Stack gap="md">
        <Alert tone="info" title={t("auth.mfa.enroll.requiredTitle")}>
          {t("auth.mfa.enroll.requiredText")}
        </Alert>
        {phase === "loading" && !errorCode ? <p className={styles.hint}>{t("auth.mfa.enroll.loading")}</p> : null}
        {phase === "scan" ? (
          <>
            <p className={styles.hint}>{t("auth.mfa.enroll.scan")}</p>
            <div className={styles.qrFrame}>
              {/* data: URL generated locally in the browser; the secret never goes to a third-party QR service */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.qrImage} src={qr} alt={t("auth.mfa.enroll.qrAlt")} />
            </div>
            <p className={styles.hint}>{t("auth.mfa.enroll.manual")}</p>
            <code className={styles.secret} data-testid="mfa-secret">
              {secret.replace(/(.{4})/g, "$1 ").trim()}
            </code>
            <Field id="mfa-enroll-code" label={t("auth.mfa.enroll.codeLabel")}>
              <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} disabled={pending} />
            </Field>
          </>
        ) : null}
        {errorCode ? (
          <Alert tone="danger" title={t("auth.mfa.errors.title")}>
            {t(errorKey(errorCode))}
          </Alert>
        ) : null}
        {phase === "scan" ? (
          <FormActions align="end">
            <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending || code.replace(/\s+/g, "").length !== 6}>
              {t("auth.mfa.enroll.confirm")}
            </Button>
          </FormActions>
        ) : null}
      </Stack>
    </form>
  );
}
