import type { ReactNode } from "react";

import { NokiLogo } from "@/components/brand/noki-logo";

import styles from "./auth-split-layout.module.css";

export interface AuthSplitLayoutProps {
  /** URL of the portal-specific background artwork (each NOKI dashboard ships its own). */
  backgroundUrl: string;
  /** Accessible name of the NOKI logo (the logo is the primary identity of the page). */
  logoAlt: string;
  /** Short portal name shown beside the logo, e.g. "NOKI SERVICE". */
  brandName: string;
  /** Landmark label of the visual panel. */
  panelLabel: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  highlights?: string[];
  /** Locale / theme controls rendered at the top of the form column. */
  controls?: ReactNode;
  /** Footer line of the form column, e.g. "© 2026 NOKI — Tous droits réservés". */
  footerText?: string;
  /** The form card (login, accept-invitation…). */
  children: ReactNode;
}

/**
 * Split-screen authentication layout shared by every NOKI dashboard: a brand panel with a portal-specific background
 * and a large NOKI logo on one side, the form card on the other. Desktop (>= 1024px) shows both side by side; below it
 * the brand panel becomes a banner above the card. All spacing uses logical properties, so RTL mirrors automatically.
 *
 * The brand panel is always rendered with the dark dashboard tokens (a deliberately fixed, premium panel).
 */
export function AuthSplitLayout({
  backgroundUrl,
  logoAlt,
  brandName,
  panelLabel,
  eyebrow,
  headline,
  subtext,
  highlights = [],
  controls,
  footerText,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className={styles.page}>
      <section
        className={styles.visual}
        data-noki-theme="dashboard-dark"
        aria-label={panelLabel}
        data-testid="auth-visual-panel"
        style={{ backgroundImage: `url("${backgroundUrl}")` }}
      >
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.visualContent}>
          <div className={styles.identity}>
            <NokiLogo size="xl" alt={logoAlt} className={styles.heroLogo} testId="auth-hero-logo" />
            <span className={styles.brandName}>{brandName}</span>
          </div>

          <div className={styles.copy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.headline}>{headline}</h1>
            <p className={styles.subtext}>{subtext}</p>
            {highlights.length > 0 ? (
              <ul className={styles.highlights}>
                {highlights.map((item) => (
                  <li key={item} className={styles.highlight}>
                    <span className={styles.check} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <div className={styles.formColumn}>
        {controls ? <div className={styles.controls}>{controls}</div> : null}
        <main className={styles.main}>
          {children}
        </main>
        {footerText ? (
          <footer className={styles.footer} data-testid="auth-footer">
            <p className={styles.footerText}>{footerText}</p>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
