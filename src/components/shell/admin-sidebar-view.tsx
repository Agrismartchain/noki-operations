"use client";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarNav, SidebarNavItem } from "@agrismartchain/noki-design-system";
import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

import styles from "./admin-sidebar-view.module.css";

export interface ResolvedShellNavItem {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
}

interface AdminSidebarViewProps {
  landmarkLabel: string;
  brand: string;
  brandScope: string;
  navigation: ResolvedShellNavItem[];
  scopeNotice: string;
}

function normalizePath(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, "") || "/";
  return withoutLocale.length > 1 ? withoutLocale.replace(/\/$/, "") : withoutLocale;
}

function isItemActive(currentPathname: string, href: string): boolean {
  const current = normalizePath(currentPathname);
  const target = normalizePath(href);

  return target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
}

export function AdminSidebarView({ landmarkLabel, brand, brandScope, navigation, scopeNotice }: AdminSidebarViewProps) {
  const pathname = usePathname();

  return (
    <Sidebar aria-label={landmarkLabel} className={styles.sidebar}>
      <SidebarHeader>
        <div className={styles.brand}>
          <span className={styles.brandName}>{brand}</span>
          <span className={styles.brandScope}>{brandScope}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav>
          {navigation.map((item) => (
            <SidebarNavItem
              key={item.key}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isItemActive(pathname, item.href)}
              className={styles.navItem}
            />
          ))}
        </SidebarNav>
      </SidebarContent>
      <SidebarFooter className={styles.footer}>{scopeNotice}</SidebarFooter>
    </Sidebar>
  );
}
