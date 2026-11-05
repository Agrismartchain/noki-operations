import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { OperationsAuthLayout } from "@/components/auth/operations-auth-layout";

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
    <OperationsAuthLayout>
      <LoginForm brand={t("common.brand")} sessionExpired={reason === "session_expired"} />
    </OperationsAuthLayout>
  );
}
