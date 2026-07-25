"use client";

import { AppShell } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import styles from "./admin-shell.module.css";

interface AdminShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  mobileNavigationLabel: string;
  children: React.ReactNode;
}

export function AdminShell({ sidebar, topbar, mobileNavigationLabel, children }: AdminShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AppShell
      className={styles.shell}
      sidebar={sidebar}
      topbar={topbar}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
      mobileNavigationLabel={mobileNavigationLabel}
    >
      {children}
    </AppShell>
  );
}
