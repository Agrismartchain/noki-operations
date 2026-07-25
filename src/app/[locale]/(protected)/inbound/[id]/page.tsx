import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import type { AdminMutationResult } from "@/features/admin/mutations";
import { completeAdminMutation, mutationAccessTokenOrError } from "@/features/admin/server/mutation-result";
import { InboundDetailView } from "@/features/operations/components/inbound-detail-view";
import { cancelInbound, getInbound, receiveInbound, shipInbound, submitInbound } from "@/features/operations/server/client";
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

function readNumber(formData: FormData, key: string): number {
  const parsed = Number(read(formData, key));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function InboundDetailPage({ params }: PageProps) {
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
  if (session.status === "forbidden" || !hasCapability(session.actor, "commerce.inbound.read")) {
    return <ForbiddenView />;
  }

  const canManage = hasCapability(session.actor, "commerce.inbound.manage");
  const shipment = await getInbound(id, { accessToken, locale });

  async function submitAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    if (!shipmentId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/admin/commerce/inbound-shipments/{id}/submit",
      locale,
      revalidatePaths: [`/${locale}/inbound/${shipmentId}`],
      mutate: () => submitInbound(shipmentId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  async function shipAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    if (!shipmentId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/admin/commerce/inbound-shipments/{id}/ship",
      locale,
      revalidatePaths: [`/${locale}/inbound/${shipmentId}`],
      mutate: () => shipInbound(shipmentId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  async function cancelAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    if (!shipmentId) return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    return completeAdminMutation({
      endpoint: "POST /v1/admin/commerce/inbound-shipments/{id}/cancel",
      locale,
      revalidatePaths: [`/${locale}/inbound/${shipmentId}`],
      mutate: () => cancelInbound(shipmentId, { accessToken: token, locale }).then(() => undefined),
    });
  }

  async function receiveAction(_state: AdminMutationResult, formData: FormData): Promise<AdminMutationResult> {
    "use server";
    const token = await mutationAccessTokenOrError(locale);
    if (typeof token !== "string") return token;
    const shipmentId = read(formData, "shipmentId");
    const idempotencyKey = read(formData, "idempotencyKey");
    const lineIds = [...new Set(formData.getAll("lineId").map((value) => String(value)))];
    if (!shipmentId || !idempotencyKey || lineIds.length === 0) {
      return { status: "error", resultId: randomUUID(), message: "Invalid request" };
    }
    const lines = lineIds.map((lineId) => ({
      shipmentLineId: lineId,
      receivedQuantity: readNumber(formData, `received-${lineId}`),
      damagedQuantity: readNumber(formData, `damaged-${lineId}`),
    }));
    return completeAdminMutation({
      endpoint: "POST /v1/admin/commerce/inbound-shipments/{id}/receive",
      locale,
      revalidatePaths: [`/${locale}/inbound/${shipmentId}`, `/${locale}/receiving`],
      mutate: () => receiveInbound(shipmentId, { idempotencyKey, lines }, { accessToken: token, locale }).then(() => undefined),
    });
  }

  return (
    <InboundDetailView
      shipment={shipment}
      submitAction={canManage ? submitAction : undefined}
      shipAction={canManage ? shipAction : undefined}
      cancelAction={canManage ? cancelAction : undefined}
      receiveAction={canManage ? receiveAction : undefined}
    />
  );
}
