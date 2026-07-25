"use client";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FormActions,
  Input,
  Stack,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";

import styles from "./login-form.module.css";

export interface LoginFormProps {
  brand: string;
  sessionExpired?: boolean;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: "auth.login.errors.invalidCredentials",
  CONFIGURATION_ERROR: "auth.login.errors.configurationMissing",
  SERVICE_UNAVAILABLE: "auth.login.errors.serviceUnavailable",
  TIMEOUT: "auth.login.errors.timeout",
  RATE_LIMITED: "auth.login.errors.rateLimited",
};

function resolveErrorMessageKey(code: string): string {
  return ERROR_MESSAGE_KEYS[code] ?? "auth.login.errors.unexpected";
}

export function LoginForm({ brand, sessionExpired = false }: LoginFormProps) {
  const t = useTranslations();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorCode) {
      alertRef.current?.focus();
    }
  }, [errorCode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const nextFieldErrors: FieldErrors = {};
    if (email.trim().length === 0) {
      nextFieldErrors.email = t("auth.login.validation.emailRequired");
    }
    if (password.length === 0) {
      nextFieldErrors.password = t("auth.login.validation.passwordRequired");
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      if (nextFieldErrors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setErrorCode(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        referrer: window.location.href,
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": document.documentElement.lang,
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorCode(body?.code ?? "UNEXPECTED_ERROR");
        setPending(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorCode("SERVICE_UNAVAILABLE");
      setPending(false);
    }
  }

  return (
    <Card className={styles.card}>
      <CardHeader>
        <Stack gap="xs">
          <span className={styles.eyebrow}>{brand}</span>
          <CardTitle>{t("auth.login.welcomeTitle")}</CardTitle>
          <CardDescription>{t("auth.login.subtitle")}</CardDescription>
        </Stack>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {sessionExpired ? <Alert tone="info">{t("session.expiredNotice")}</Alert> : null}

          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="md">
              <Field id="login-email" label={t("auth.login.emailLabel")} error={fieldErrors.email} invalid={Boolean(fieldErrors.email)}>
                <Input
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={pending}
                />
              </Field>

              <Field
                id="login-password"
                label={t("auth.login.passwordLabel")}
                error={fieldErrors.password}
                invalid={Boolean(fieldErrors.password)}
              >
                <Input
                  ref={passwordRef}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                />
              </Field>

              {errorCode ? (
                <div ref={alertRef} tabIndex={-1} aria-live="assertive">
                  <Alert tone="danger" title={t("auth.login.errorTitle")}>
                    {t(resolveErrorMessageKey(errorCode))}
                  </Alert>
                </div>
              ) : null}

              <FormActions align="end">
                <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
                  {pending ? t("auth.login.submitPending") : t("auth.login.submit")}
                </Button>
              </FormActions>
            </Stack>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
}
