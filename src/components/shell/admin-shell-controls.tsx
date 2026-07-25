"use client";

import { Button, Inline, ThemeToggle } from "@agrismartchain/noki-design-system";
import { useLocale, useTranslations } from "next-intl";

import { LogoutButton } from "@/components/auth/logout-button";
import { useNokiTheme } from "@/components/theme/noki-theme-provider";
import { isLocale, LOCALES } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";

import styles from "./admin-shell-controls.module.css";

export interface AdminShellControlsProps {
  /** Only the authenticated shell (protected layout) has a session to sign out of. */
  showLogout?: boolean;
}

export function AdminShellControls({ showLogout = false }: AdminShellControlsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { theme, setTheme } = useNokiTheme();
  const pathname = usePathname();
  const router = useRouter();

  function handleLocaleChange(code: string) {
    if (!isLocale(code) || code === locale) {
      return;
    }
    router.replace(pathname, { locale: code });
  }

  return (
    <Inline gap="sm" align="center" className={styles.controls}>
      {/*
       * An always-visible toggle group is used instead of the design
       * system's Popover-based LocaleSwitcher -- see noki-admin's
       * admin-shell-controls.tsx for the upstream react-aria-components
       * issue this works around.
       */}
      <Inline gap="xs" align="center" role="group" aria-label={t("locale.switcherLabel")} className={styles.localeGroup}>
        {LOCALES.map((code) => (
          <Button
            key={code}
            type="button"
            variant={locale === code ? "primary" : "ghost"}
            size="sm"
            aria-pressed={locale === code}
            onClick={() => handleLocaleChange(code)}
          >
            {code.toUpperCase()}
          </Button>
        ))}
      </Inline>
      <ThemeToggle
        className={styles.themeToggle}
        theme={theme}
        onThemeChange={setTheme}
        lightLabel={t("theme.light")}
        darkLabel={t("theme.dark")}
        aria-label={t("theme.switcherLabel")}
      />
      {showLogout ? <span className={styles.logoutControl}><LogoutButton /></span> : null}
    </Inline>
  );
}
