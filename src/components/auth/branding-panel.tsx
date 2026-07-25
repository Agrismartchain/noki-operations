import { getTranslations } from "next-intl/server";

import styles from "./branding-panel.module.css";

/**
 * Always rendered with the dark theme tokens regardless of the app-wide
 * light/dark preference -- a deliberately fixed premium panel, matching
 * noki-admin's split-screen login reference direction.
 */
export async function BrandingPanel() {
  const t = await getTranslations();

  return (
    <section className={styles.panel} data-noki-theme="dashboard-dark" aria-label={t("auth.branding.eyebrow")}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.wordmark}>
          <span className={styles.wordmarkMark} aria-hidden="true">
            N
          </span>
          <span className={styles.wordmarkText}>{t("common.brandOrganization")}</span>
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t("auth.branding.eyebrow")}</p>
          <h1 className={styles.headline}>{t("auth.branding.headline")}</h1>
          <p className={styles.subtext}>{t("auth.branding.subtext")}</p>
        </div>
      </div>
    </section>
  );
}
