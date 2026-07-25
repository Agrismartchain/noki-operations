import { getLocale, getTranslations } from "next-intl/server";
import { createElement } from "react";

import { DOMAIN_ICONS } from "@/domains/icons";
import { hasCapability, type SanitizedActor } from "@/lib/auth";

import { AdminSidebarView, type ResolvedShellNavItem } from "./admin-sidebar-view";
import { getShellNavigation, type ShellNavItem } from "./shell-navigation";

interface AdminSidebarProps {
  actor?: SanitizedActor;
}

function translateNavItem(t: Awaited<ReturnType<typeof getTranslations>>, item: ShellNavItem): ResolvedShellNavItem {
  const Icon = DOMAIN_ICONS[item.key];

  return {
    key: item.key,
    href: item.href,
    label: t(item.labelKey),
    icon: Icon ? createElement(Icon, { size: 18 }) : undefined,
  };
}

/**
 * Every item is hidden unless the actor's real backend-derived capabilities
 * (from GET /v1/auth/capabilities) include the permission code the item
 * declares in DOMAIN_REGISTRY -- a denied capability hides the nav item
 * entirely, it is never just visually masked. The corresponding route also
 * re-checks the same capability server-side (see each page.tsx), since
 * hiding a link is not an access control boundary on its own.
 */
export async function AdminSidebar({ actor }: AdminSidebarProps) {
  const locale = await getLocale();
  const t = await getTranslations();
  const canUse = (capability: string): boolean => (actor ? hasCapability(actor, capability) : false);

  const navigation = getShellNavigation(locale)
    .filter((item) => !item.capability || canUse(item.capability))
    .map((item) => translateNavItem(t, item));

  return (
    <AdminSidebarView
      landmarkLabel={t("navigation.landmarkLabel")}
      brand={t("common.brand")}
      brandScope={t("common.brandOrganization")}
      navigation={navigation}
      scopeNotice={t("navigation.scopeNotice")}
    />
  );
}
