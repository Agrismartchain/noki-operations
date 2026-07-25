import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import { completeAdminMutation, mutationAccessTokenOrError } from "@/features/admin/server/mutation-result";
import { PackingDetailView } from "@/features/operations/components/packing-detail-view";
import { completePackingTask, getFulfillmentTask } from "@/features/operations/server/client";
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

export default async function PackingDetailPage({ params }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "fulfillment.task.pack")) {
    return <ForbiddenView />;
  }

  const canPack = hasCapability(session.actor, "fulfillment.task.pack");
  const task = await getFulfillmentTask(id, { accessToken, locale });

  async function completePackingAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const taskId = read(formData, "taskId");
    if (!taskId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    const packageCount = Number.parseInt(read(formData, "packageCount"), 10);
    if (!Number.isInteger(packageCount) || packageCount < 1) {
      return { status: "error", resultId: randomUUID(), message: "packageCount must be a strictly positive integer" };
    }
    const weightRaw = read(formData, "weightKg");
    let weightKg: number | undefined;
    if (weightRaw) {
      const parsed = Number.parseFloat(weightRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { status: "error", resultId: randomUUID(), message: "weightKg must be a positive decimal" };
      }
      weightKg = Math.round(parsed * 1000) / 1000;
    }
    const notes = read(formData, "notes");
    return completeAdminMutation({
      endpoint: "POST /v1/fulfillment/tasks/{id}/complete-packing",
      locale,
      revalidatePaths: [`/${locale}/packing/${taskId}`, `/${locale}/qc`],
      mutate: () =>
        completePackingTask(
          taskId,
          { packageCount, ...(weightKg !== undefined ? { weightKg } : {}), ...(notes ? { notes } : {}) },
          { accessToken: token, locale },
        ).then(() => undefined),
    });
  }

  return <PackingDetailView task={task} completePackingAction={canPack ? completePackingAction : undefined} />;
}
