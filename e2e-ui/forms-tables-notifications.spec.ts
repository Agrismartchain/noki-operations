import { expect, test } from "@playwright/test";

import { loginAsOperations, setTheme } from "./support/auth";

// Forms (inventory adjustment), tables (sort buttons, pagination, row actions) and notifications (toast stack) keep working
// and follow the 48/44px standard in FR/EN/AR, light/dark, desktop/tablet/mobile.
const COMBOS = [
  { locale: "fr", width: 1440, height: 900, theme: "dashboard-light" },
  { locale: "ar", width: 768, height: 1024, theme: "dashboard-dark" },
  { locale: "en", width: 390, height: 844, theme: "dashboard-light" },
] as const;

for (const combo of COMBOS) {
  test(`inventory: table + adjustment form + toast (${combo.locale} ${combo.theme.replace("dashboard-", "")} @${combo.width})`, async ({ page }) => {
    await setTheme(page, combo.theme);
    await page.setViewportSize({ width: combo.width, height: combo.height });
    await loginAsOperations(page, combo.locale);
    await page.goto(`/${combo.locale}/inventory`, { waitUntil: "networkidle" });

    // Table: sort buttons have a 44px hit area without growing the header; the table never overflows the page.
    const table = page.locator("main table").first();
    await expect(table).toBeVisible();
    const sort = await table.locator("thead button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height).filter((h) => h > 0));
    expect(sort.length).toBeGreaterThan(0);
    for (const h of sort) expect(h).toBeGreaterThanOrEqual(43.5);
    const head = await table.locator("thead tr").first().boundingBox();
    expect(head?.height ?? 0).toBeLessThanOrEqual(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    // Up to 1279px the adjustment form is offered through a per-row dialog action (covered end-to-end in table-actions.spec.ts):
    // here we only check that the inline column is replaced by that action, never silently dropped.
    if (combo.width < 1280) {
      await expect(page.locator('main button[aria-haspopup="dialog"]').first()).toBeVisible();
      return;
    }

    // Form: fields are compact (44px) inside the table cell, readable border, and the submit is a 44px+ button.
    const form = page.locator('main form').filter({ has: page.locator('input[name="quantity"]') }).first();
    await expect(form).toBeVisible();
    const fieldHeights = await form.locator("select, input:not([type=hidden])").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(fieldHeights.length).toBeGreaterThanOrEqual(3);
    for (const h of fieldHeights) expect(h).toBeGreaterThanOrEqual(43.5);
    // The table re-renders after each server action: always re-resolve the form and its controls.
    const formNow = () => page.locator("main form").filter({ has: page.locator('input[name="quantity"]') }).first();
    const submitNow = () => formNow().locator('button[type="submit"]');
    expect((await submitNow().boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);

    // Submit twice: a toast stack appears and must never trap the next control.
    for (let i = 0; i < 2; i += 1) {
      await formNow().locator('input[name="quantity"]').fill("3");
      await submitNow().click({ timeout: 5_000 });
      await expect(page.locator('div[role="region"][data-react-aria-top-layer="true"] [role="alert"]').last()).toBeVisible({ timeout: 15_000 });
    }
    await submitNow().evaluate((el) => el.scrollIntoView({ block: "center" }));
    const covered = await submitNow().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return !el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(covered, "submit reachable by scrolling while toasts are on screen").toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("pagination and row actions are at least 44px (picking queue)", async ({ page }) => {
  await loginAsOperations(page);
  await page.goto("/fr/picking", { waitUntil: "networkidle" });
  const targets = await page.locator("main a[href*='/picking/'], main nav[aria-label*='agination' i] button, main button[aria-label*='uivant' i], main button[aria-label*='récédent' i]").evaluateAll((els) => els.map((el) => ({ h: el.getBoundingClientRect().height, label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20) })));
  expect(targets.length).toBeGreaterThan(0);
  for (const t of targets) expect(t.h, t.label).toBeGreaterThanOrEqual(43.5);
});
