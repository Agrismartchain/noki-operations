import { expect, test } from "@playwright/test";

import { FOOTER_TEXT, loginAsOperations, OPEN_NAV, setTheme } from "./support/auth";

const LOCALES = ["fr", "en", "ar"] as const;
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];

test.describe("Operations login — split-screen (NOKI Admin standard)", () => {
  for (const theme of ["dashboard-light", "dashboard-dark"] as const) {
    for (const locale of LOCALES) {
      for (const viewport of VIEWPORTS) {
        test(`login ${locale} ${theme.replace("dashboard-", "")} @${viewport.width}: brand panel, logo, card, footer, 48px, no overflow`, async ({ page }) => {
          await setTheme(page, theme);
          await page.setViewportSize(viewport);
          await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });
          await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          await expect(page.locator("html")).toHaveAttribute("data-noki-theme", theme);

          const panel = page.getByTestId("auth-visual-panel");
          await expect(panel).toBeVisible();
          expect(await panel.evaluate((el) => getComputedStyle(el).backgroundImage), "operations background").toMatch(/operations-dashboard-bg.*\.svg/);

          const logo = page.getByTestId("auth-hero-logo");
          await expect(logo).toBeVisible();
          const info = await logo.evaluate((img: HTMLImageElement) => ({ ok: img.complete && img.naturalWidth > 0, w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height, alt: img.alt }));
          expect(info.ok).toBe(true);
          expect(info.alt).toBe("NOKI");
          expect(Math.abs(info.w / info.h - 480 / 384)).toBeLessThan(0.0125);
          expect(info.w).toBeGreaterThanOrEqual(viewport.width >= 1024 ? 140 : viewport.width >= 768 ? 90 : 70);

          const submit = page.locator('main button[type="submit"]');
          expect((await submit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
          const password = await page.locator('main input[type="password"]').boundingBox();
          const submitBox = await submit.boundingBox();
          expect((submitBox?.y ?? 0) - ((password?.y ?? 0) + (password?.height ?? 0))).toBeGreaterThanOrEqual(16);

          const panelBox = await panel.boundingBox();
          const cardBox = await page.locator("main form").first().boundingBox();
          if (viewport.width >= 1024) {
            if (locale === "ar") expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(panelBox?.x ?? 0);
            else expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(cardBox!.x);
          } else {
            expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(cardBox!.y);
          }

          const footer = page.getByTestId("auth-footer");
          await expect(footer).toContainText(`© ${new Date().getFullYear()} NOKI`);
          await expect(footer).toContainText(FOOTER_TEXT[locale]);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        });
      }
    }
  }

  test("locale switcher keeps working on the new layout", async ({ page }) => {
    await page.goto("/fr/login", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "EN" }).first().click();
    await page.waitForURL(/\/en\/login/);
    await expect(page.getByTestId("auth-footer")).toContainText("All rights reserved");
    await page.getByRole("button", { name: "AR" }).first().click();
    await page.waitForURL(/\/ar\/login/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("Operations shell — sidebar and footer", () => {
  test("sidebar: wide, 48px items with icons, readable active state, logo first (FR)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsOperations(page);
    await page.goto("/fr/inventory", { waitUntil: "networkidle" });

    const nav = page.getByRole("navigation", { name: /navigation principale|main navigation/i });
    const items = nav.locator("a");
    expect(await items.count()).toBeGreaterThanOrEqual(8);
    const metrics = await items.evaluateAll((els) => els.map((el) => ({ h: el.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(el).fontSize), icon: !!el.querySelector("svg") })));
    for (const m of metrics) {
      expect(m.h).toBeGreaterThanOrEqual(47.5);
      expect(m.fs).toBeGreaterThanOrEqual(14);
      expect(m.icon, "every item has an icon").toBe(true);
    }
    const sidebarWidth = await page.locator('[data-testid="admin-sidebar-logo"]:visible').first().evaluate((el) => (el.closest("aside, [class*=sidebar]") as HTMLElement).getBoundingClientRect().width);
    expect(sidebarWidth).toBeGreaterThanOrEqual(270);

    const active = nav.locator('a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText(/Inventaire/);
    const style = await active.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { weight: parseInt(cs.fontWeight, 10), filled: cs.backgroundImage !== "none" || cs.backgroundColor !== "rgba(0, 0, 0, 0)" };
    });
    expect(style.weight).toBeGreaterThanOrEqual(600);
    expect(style.filled, "active item has a filled background").toBe(true);

    const logo = await page.locator('[data-testid="admin-sidebar-logo"]:visible').first().boundingBox();
    const first = await items.first().boundingBox();
    expect((logo?.y ?? 0) + (logo?.height ?? 0)).toBeLessThanOrEqual(first?.y ?? 0);
  });

  for (const locale of LOCALES) {
    test(`footer: © <year> NOKI at the bottom, sidebar on the inline-start edge, no overflow (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loginAsOperations(page);
      await page.goto(`/${locale}/inventory`, { waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const footer = page.getByTestId("app-footer");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();
      await expect(footer).toContainText(`© ${new Date().getFullYear()} NOKI`);
      await expect(footer).toContainText(FOOTER_TEXT[locale]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      const logo = await page.locator('[data-testid="admin-sidebar-logo"]:visible').first().boundingBox();
      if (locale === "ar") expect(logo!.x).toBeGreaterThan(720);
      else expect(logo!.x).toBeLessThan(720);
    });
  }

  for (const locale of LOCALES) {
    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      test(`drawer ${locale} @${viewport.width}: 44px trigger, logo, 48px items, footer reachable, no overflow`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginAsOperations(page);
        await page.goto(`/${locale}`, { waitUntil: "networkidle" });
        const trigger = page.getByRole("button", { name: OPEN_NAV }).first();
        const box = await trigger.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
        await trigger.click();
        const logo = page.locator('[data-testid="admin-sidebar-logo"]:visible').first();
        await expect(logo).toBeVisible();
        const items = page.locator("aside a:visible, [role=dialog] a:visible");
        expect(await items.count()).toBeGreaterThanOrEqual(8);
        for (const h of await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(47.5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        await page.keyboard.press("Escape");
        const footer = page.getByTestId("app-footer");
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible();
      });
    }
  }
});
