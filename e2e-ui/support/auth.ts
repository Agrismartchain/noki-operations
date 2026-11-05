import { expect, type Page } from "@playwright/test";

export const OPS_EMAIL = "operations@local.noki.test";

/** Signs in through the real login form (BFF + stub API). Same-origin CSRF is satisfied by the test origin proxy. */
export async function loginAsOperations(page: Page, locale: "fr" | "en" | "ar" = "fr") {
  await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });
  await page.locator('main input[type="email"]').fill(OPS_EMAIL);
  await page.locator('main input[type="password"]').fill("local-password");
  const submit = page.locator('main button[type="submit"]');
  const [response] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/auth/login")), submit.click()]);
  expect(response.status(), await response.text()).toBe(200);
  await page.waitForURL(new RegExp(`/${locale}$`), { timeout: 15_000 });
}

export async function setTheme(page: Page, theme: "dashboard-light" | "dashboard-dark") {
  await page.addInitScript((t) => window.localStorage.setItem("noki-operations-theme", t), theme);
}

export const OPEN_NAV = /ouvrir le menu|open menu|فتح القائمة/i;
export const FOOTER_TEXT = { fr: "Tous droits réservés", en: "All rights reserved", ar: "جميع الحقوق محفوظة" } as const;
