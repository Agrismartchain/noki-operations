import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { ComingSoonView } from "@/features/operations/components/coming-soon-view";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

/**
 * Real, capability-gated route. The mutation endpoint already exists in
 * noki-api (POST /v1/fulfillment/tasks/{id}/complete-packing) but the
 * packing-queue UI is out of scope for this pass -- see
 * src/domains/registry.ts.
 */
export default async function PackingPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect({ href: "/login", locale });
    return;
  }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status === "unauthenticated") {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.status === "forbidden" || !hasCapability(session.actor, "fulfillment.task.pack")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  return (
    <ComingSoonView
      eyebrow={t("common.brand")}
      title={t("navigation.packing")}
      description={t("comingSoon.description")}
      comingSoonTitle={t("comingSoon.title")}
      comingSoonDescription={t("comingSoon.description")}
    />
  );
}
