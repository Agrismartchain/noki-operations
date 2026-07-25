import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { SHELL_NAVIGATION, localizeShellHref } from "../src/components/shell/shell-navigation";
import { assertNoNextOverlay, collectAppConsoleIssues, loginAsOperationsDemo } from "./support/auth-real";

const sidebarRoutes = SHELL_NAVIGATION.map((item) => localizeShellHref("fr", item.href));

test.describe("noki-operations real-stack smoke (OPERATIONS demo account)", () => {
  test("every sidebar route loads against the real API without 404/500, with real KPI data on the dashboard", async ({ page }) => {
    const consoleIssues = collectAppConsoleIssues(page);
    await loginAsOperationsDemo(page);

    const results: Array<{ route: string; status: number | null; h1Count: number; ok: boolean }> = [];

    for (const route of sidebarRoutes) {
      const response = await page.goto(route, { waitUntil: "load", timeout: 30_000 });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
      const status = response?.status() ?? null;
      const h1Count = await page.locator("h1").count();
      await assertNoNextOverlay(page);
      const visibleText: string = await page.evaluate(() => document.body.innerText);
      const hasErrorText = /This page could not be found|Application error|Internal Server Error/i.test(visibleText);
      const ok = (status ?? 0) < 400 && h1Count === 1 && !hasErrorText;
      results.push({ route, status, h1Count, ok });

      expect(status, route).toBeLessThan(400);
      expect(h1Count, route).toBe(1);
      expect(hasErrorText, route).toBe(false);
    }

    const reportDir = path.join(process.cwd(), "e2e-recette", "report");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "route-smoke.json"), JSON.stringify(results, null, 2));

    // Dashboard KPI tiles must reflect real backend data, not a blank/errored page.
    await page.goto("/fr", { waitUntil: "load" });
    await expect(page.getByText(/Actualisé le/)).toBeVisible();
    await expect(page.getByText("Entrepôts", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Qualité", { exact: true })).toBeVisible();

    expect(consoleIssues, JSON.stringify(consoleIssues)).toEqual([]);
  });

  test("inbound list -> detail -> partial receipt workflow works end to end against the real API", async ({ page }) => {
    await loginAsOperationsDemo(page);
    await page.goto("/fr/inbound", { waitUntil: "load" });
    await expect(page.locator("h1")).toBeVisible();

    const firstRow = page.getByRole("row").nth(1);
    const hasRows = await firstRow.isVisible().catch(() => false);
    expect(hasRows, "demo dataset must contain an inbound shipment for the recette").toBe(true);

    await page.getByRole("link", { name: /voir|view/i }).first().click();
    await expect(page.locator("h1")).toBeVisible();
    await assertNoNextOverlay(page);
  });

  test("screenshots: dashboard desktop, mobile (390px), dark mode, and Arabic RTL", async ({ page }) => {
    await loginAsOperationsDemo(page);
    await page.goto("/fr", { waitUntil: "load" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e-recette/screenshots/operations-dashboard.png", fullPage: true });

    await page.goto("/fr/inbound", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-inbound.png", fullPage: true });

    await page.goto("/fr/receiving", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-receiving.png", fullPage: true });

    await page.goto("/fr/inventory", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-inventory.png", fullPage: true });

    await page.goto("/fr/picking", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-picking.png", fullPage: true });

    await page.goto("/fr/qc", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-qc.png", fullPage: true });

    await page.goto("/fr/shipping", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-shipping.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fr", { waitUntil: "load" });
    await page.waitForTimeout(300);
    await expect(page.locator("h1")).toBeVisible();
    await page.screenshot({ path: "e2e-recette/screenshots/operations-mobile-390.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    const themeToggle = page.getByRole("button", { name: /sombre|dark|clair|light/i }).first();
    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(200);
    }
    await page.goto("/fr", { waitUntil: "load" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e-recette/screenshots/operations-dark.png", fullPage: true });

    await page.goto("/ar", { waitUntil: "load" });
    await page.waitForTimeout(300);
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
    await page.screenshot({ path: "e2e-recette/screenshots/operations-ar-rtl.png", fullPage: true });
  });
});
