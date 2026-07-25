import { getTranslations } from "next-intl/server";

import { ForbiddenViewClient } from "./forbidden-view-client";

/**
 * Rendered whenever a valid session lacks the capability a route requires --
 * either GET /v1/auth/me itself returned 403 (missing auth.me.read), or a
 * page-level hasCapability check failed for its own required permission
 * code. The session itself is not destroyed: this is a permission gap, not
 * an authentication failure.
 */
export async function ForbiddenView() {
  const t = await getTranslations();

  return <ForbiddenViewClient title={t("errors.forbiddenTitle")} description={t("errors.forbiddenDescription")} />;
}
