"use server";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import type { AdminMutationResult } from "@/features/admin/mutations";
import { NokiApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

function fieldErrorsFromApi(error: NokiApiError): Record<string, string[]> | undefined {
  if (error.details.length === 0) {
    return undefined;
  }

  return Object.fromEntries(error.details.map((detail) => [detail.field, detail.messages]));
}

export async function mutationErrorResult(
  error: unknown,
  locale: string,
  endpoint: string,
): Promise<AdminMutationResult> {
  const t = await getTranslations({ locale });

  if (error instanceof NokiApiError) {
    console.error("NOKI operations mutation failed", {
      endpoint,
      status: error.status,
      apiCode: error.apiCode,
      correlationId: error.correlationId,
    });

    const messageKey = {
      bad_request: "mutations.errors.validation",
      unprocessable: "mutations.errors.validation",
      forbidden: "mutations.errors.forbidden",
      conflict: "mutations.errors.conflict",
      rate_limited: "mutations.errors.rateLimited",
      server_error: "mutations.errors.unavailable",
      network: "mutations.errors.unavailable",
      timeout: "mutations.errors.unavailable",
      unauthorized: "mutations.errors.forbidden",
      config: "mutations.errors.unavailable",
      unexpected: "mutations.errors.unexpected",
    } satisfies Record<NokiApiError["kind"], string>;

    return {
      status: "error",
      resultId: randomUUID(),
      message: t(messageKey[error.kind]),
      statusCode: error.status,
      apiCode: error.apiCode,
      correlationId: error.correlationId,
      fieldErrors: fieldErrorsFromApi(error),
    };
  }

  console.error("NOKI operations mutation failed", {
    endpoint,
    status: undefined,
    apiCode: undefined,
    correlationId: undefined,
  });
  return { status: "error", resultId: randomUUID(), message: t("mutations.errors.unexpected") };
}

export async function mutationAccessTokenOrError(locale: string): Promise<string | AdminMutationResult> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) {
    return token;
  }

  const t = await getTranslations({ locale });
  return { status: "error", resultId: randomUUID(), message: t("mutations.errors.forbidden") };
}

export async function completeAdminMutation({
  endpoint,
  locale,
  mutate,
  revalidatePaths,
  successMessageKey = "mutations.saved",
}: {
  endpoint: string;
  locale: string;
  mutate: () => Promise<void>;
  revalidatePaths: string[];
  successMessageKey?: string;
}): Promise<AdminMutationResult> {
  try {
    await mutate();

    const t = await getTranslations({ locale });
    return {
      status: "success",
      resultId: randomUUID(),
      message: t(successMessageKey),
      refresh: revalidatePaths.length > 0,
    };
  } catch (error) {
    return mutationErrorResult(error, locale, endpoint);
  }
}
