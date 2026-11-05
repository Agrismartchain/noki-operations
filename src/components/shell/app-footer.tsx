import { getTranslations } from "next-intl/server";

import styles from "./app-footer.module.css";

/** Global dashboard footer: © <current year> NOKI — rights reserved. Year is computed at request time. */
export async function AppFooter({ year = new Date().getFullYear() }: { year?: number } = {}) {
  const t = await getTranslations("shell.footer");
  return (
    <footer className={styles.footer} data-testid="app-footer">
      <p className={styles.text}>{t("copyright", { year })}</p>
    </footer>
  );
}
