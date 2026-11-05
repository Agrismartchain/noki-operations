import { expect, test } from "@playwright/test";

import { setTheme } from "./support/auth";

// The MFA flow (privileged accounts) keeps working inside the new split-screen layout; its controls and errors follow the
// same standards. The stub returns 202 + challenge for e-mails containing "mfa-verify" / "mfa-enroll" and accepts 123456.
async function startLogin(page: import("@playwright/test").Page, email: string, locale = "fr") {
  await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });
  await page.locator('main input[type="email"]').fill(email);
  await page.locator('main input[type="password"]').fill("local-password");
  await page.locator('main button[type="submit"]').click();
}

test.describe("MFA login", () => {
  for (const theme of ["dashboard-light", "dashboard-dark"] as const) {
    test(`verify step: split layout kept, 48px submit, wrong code shows a readable error, right code signs in (${theme.replace("dashboard-", "")})`, async ({ page }) => {
      await setTheme(page, theme);
      await startLogin(page, "ops.mfa-verify@local.noki.test");
      const code = page.locator("#mfa-code");
      await expect(code).toBeVisible();
      await expect(page.getByTestId("auth-visual-panel")).toBeVisible();
      await expect(page.getByTestId("auth-footer")).toContainText(`© ${new Date().getFullYear()} NOKI`);

      const controls = await page.locator("main button, main input:not([type=hidden])").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height > 2).map((el) => ({ tag: el.tagName, h: el.getBoundingClientRect().height, text: (el.textContent || "").trim().slice(0, 24) })));
      for (const c of controls) expect(c.h, `${c.tag} ${c.text}`).toBeGreaterThanOrEqual(43.5);

      await code.fill("000000");
      await page.locator('main button[type="submit"]').click();
      const alert = page.locator('main [role="alert"], main [class*="alert" i]').first();
      await expect(alert).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      await code.fill("123456");
      await page.locator('main button[type="submit"]').click();
      await page.waitForURL(/\/fr$/, { timeout: 15_000 });
      await expect(page.getByTestId("app-footer")).toBeVisible();
    });
  }

  test("enroll step: secret + QR shown, confirm with the right code reveals recovery codes, then continues to the dashboard", async ({ page }) => {
    await startLogin(page, "ops.mfa-enroll@local.noki.test");
    await expect(page.getByTestId("auth-visual-panel")).toBeVisible();
    const secret = page.getByTestId("mfa-secret");
    await expect(secret).toBeVisible({ timeout: 15_000 });
    expect((await secret.textContent())?.replace(/\s+/g, "")).toBe("JBSWY3DPEHPK3PXP");
    await expect(page.locator("main img")).toBeVisible();
    await page.locator("#mfa-enroll-code").fill("123456");
    await page.locator('main button[type="submit"]').click();
    const codes = page.getByTestId("recovery-codes");
    await expect(codes).toBeVisible({ timeout: 15_000 });
    await expect(codes).toContainText("ABCD-EFGH-JKMN");
    const continueButton = page.locator("main button:not([type=submit])").last();
    await expect(continueButton).toBeDisabled();
    await page.locator('main input[type="checkbox"]').check();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await page.waitForURL(/\/fr$/, { timeout: 15_000 });
  });

  for (const locale of ["ar", "en"] as const) {
    test(`verify step in ${locale} (${locale === "ar" ? "RTL" : "LTR"}) has no overflow at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await startLogin(page, "ops.mfa-verify@local.noki.test", locale);
      await expect(page.locator("#mfa-code")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
