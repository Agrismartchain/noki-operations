import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import operationsBackground from "@/assets/brand/login/operations-dashboard-bg.svg";
import { AdminShellControls } from "@/components/shell/admin-shell-controls";

import { AuthSplitLayout } from "./auth-split-layout";

function assetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

/**
 * NOKI Operations configuration of the shared split-screen authentication pattern.
 *
 * To reuse the pattern in another NOKI dashboard: copy this file, change `background` to that portal's own artwork
 * (src/assets/brand/login/<portal>-dashboard-bg.svg|jpg) and the `auth.branding.*` copy; the layout itself
 * (AuthSplitLayout) does not change.
 */
export async function OperationsAuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <AuthSplitLayout
      backgroundUrl={assetUrl(operationsBackground)}
      logoAlt={t("auth.branding.logoAlt")}
      brandName={t("common.brandOrganization")}
      panelLabel={t("auth.branding.eyebrow")}
      eyebrow={t("auth.branding.eyebrow")}
      headline={t("auth.branding.headline")}
      subtext={t("auth.branding.subtext")}
      highlights={[
        t("auth.branding.highlights.receiving"),
        t("auth.branding.highlights.fulfillment"),
        t("auth.branding.highlights.shipping"),
      ]}
      controls={<AdminShellControls />}
      footerText={t("shell.footer.copyright", { year: new Date().getFullYear() })}
    >
      {children}
    </AuthSplitLayout>
  );
}
