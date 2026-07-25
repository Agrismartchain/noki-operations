import { DOMAIN_REGISTRY } from "@/domains/registry";
import type { DomainDescriptor } from "@/domains/types";

export interface ShellNavItem {
  key: string;
  labelKey: string;
  href: string;
  capability?: string;
}

function deriveShellNavigation(registry: DomainDescriptor[]): ShellNavItem[] {
  return registry.map((domain) => ({
    key: domain.id,
    labelKey: domain.labelKey,
    href: domain.href,
    capability: domain.capability,
  }));
}

export const SHELL_NAVIGATION: ShellNavItem[] = deriveShellNavigation(DOMAIN_REGISTRY);

export function localizeShellHref(locale: string, href: string): string {
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

export function getShellNavigation(locale: string): ShellNavItem[] {
  return SHELL_NAVIGATION.map((item) => ({ ...item, href: localizeShellHref(locale, item.href) }));
}
