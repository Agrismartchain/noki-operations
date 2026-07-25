import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import { completeAdminMutation, mutationAccessTokenOrError } from "@/features/admin/server/mutation-result";
import { QcDetailView } from "@/features/operations/components/qc-detail-view";
import { getFulfillmentTask, qualityCheckFulfillmentTask } from "@/features/operations/server/client";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default async function QcDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "commerce.qc.manage")) {
    return <ForbiddenView />;
  }

  const canManageQc = hasCapability(session.actor, "commerce.qc.manage");
  const task = await getFulfillmentTask(id, { accessToken, locale });

  async function qualityCheckAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const taskId = read(formData, "taskId");
    const status = read(formData, "status");
    const reason = read(formData, "reason");
    const notes = read(formData, "notes");
    if (!taskId || (status !== "PASSED" && status !== "FAILED")) {
      return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    }
    if (status === "FAILED" && reason.length === 0) {
      const t = await getTranslations({ locale });
      return { status: "error", resultId: randomUUID(), message: t("qc.detail.reasonRequired") };
    }
    return completeAdminMutation({
      endpoint: "POST /v1/admin/commerce/fulfillment/tasks/{id}/qc",
      locale,
      revalidatePaths: [`/${locale}/qc/${taskId}`, `/${locale}/qc`, `/${locale}/shipping`],
      mutate: () =>
        qualityCheckFulfillmentTask(
          taskId,
          { status, reason: reason || undefined, notes: notes || undefined },
          { accessToken: token, locale },
        ).then(() => undefined),
    });
  }

  return <QcDetailView task={task} qualityCheckAction={canManageQc ? qualityCheckAction : undefined} />;
}
