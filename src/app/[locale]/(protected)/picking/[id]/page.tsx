import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import { completeAdminMutation, mutationAccessTokenOrError } from "@/features/admin/server/mutation-result";
import { PickingDetailView } from "@/features/operations/components/picking-detail-view";
import { assignFulfillmentTask, completePickingTask, getFulfillmentTask, startPickingTask } from "@/features/operations/server/client";
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

export default async function PickingDetailPage({ params }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "fulfillment.task.pick")) {
    return <ForbiddenView />;
  }

  const canAssign = hasCapability(session.actor, "fulfillment.task.assign");
  const canPick = hasCapability(session.actor, "fulfillment.task.pick");
  const task = await getFulfillmentTask(id, { accessToken, locale });

  async function assignAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const taskId = read(formData, "taskId");
    const assignedActorId = read(formData, "assignedActorId");
    if (!taskId || !assignedActorId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/fulfillment/tasks/{id}/assign",
      locale,
      revalidatePaths: [`/${locale}/picking/${taskId}`],
      mutate: () => assignFulfillmentTask(taskId, assignedActorId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  async function startPickingAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const taskId = read(formData, "taskId");
    if (!taskId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/fulfillment/tasks/{id}/start-picking",
      locale,
      revalidatePaths: [`/${locale}/picking/${taskId}`],
      mutate: () => startPickingTask(taskId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  async function completePickingAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const taskId = read(formData, "taskId");
    if (!taskId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/fulfillment/tasks/{id}/complete-picking",
      locale,
      revalidatePaths: [`/${locale}/picking/${taskId}`, `/${locale}/packing`],
      mutate: () => completePickingTask(taskId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  return (
    <PickingDetailView
      task={task}
      assignAction={canAssign ? assignAction : undefined}
      startPickingAction={canPick ? startPickingAction : undefined}
      completePickingAction={canPick ? completePickingAction : undefined}
    />
  );
}
