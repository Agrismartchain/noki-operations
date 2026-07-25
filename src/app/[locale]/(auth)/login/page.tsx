import { getTranslations, setRequestLocale } from "next-intl/server";

import { BrandingPanel } from "@/components/auth/branding-panel";
import { LoginForm } from "@/components/auth/login-form";
import { AdminShellControls } from "@/components/shell/admin-shell-controls";

import styles from "./page.module.css";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { reason } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className={styles.page}>
      <BrandingPanel />

      <div className={styles.loginPanel}>
        <div className={styles.controls}>
          <AdminShellControls />
        </div>
        <main className={styles.content}>
          <LoginForm brand={t("common.brand")} sessionExpired={reason === "session_expired"} />
        </main>
      </div>
    </div>
  );
}
