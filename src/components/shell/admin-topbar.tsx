import { getTranslations } from "next-intl/server";

import type { SanitizedActor } from "@/lib/auth";

import { AdminTopbarView } from "./admin-topbar-view";

interface AdminTopbarProps {
  actor?: SanitizedActor;
}

export async function AdminTopbar({ actor }: AdminTopbarProps) {
  const t = await getTranslations();

  return <AdminTopbarView actor={actor} context={t("navigation.dashboard")} />;
}
