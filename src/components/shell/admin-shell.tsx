"use client";

import { AppShell } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import styles from "./admin-shell.module.css";

interface AdminShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  mobileNavigationLabel: string;
  /** Global footer, rendered below the page content inside the shell. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ sidebar, topbar, mobileNavigationLabel, footer, children }: AdminShellProps) {
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
      <div className={styles.frame}>
        <div className={styles.frameBody}>{children}</div>
        {footer}
      </div>
    </AppShell>
  );
}
