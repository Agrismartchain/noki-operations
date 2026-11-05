import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { loginAsOperations } from "./support/auth";

// Non-regression: no critical action may become unreachable because the shared responsive table hides its column.
// The shared DataTable (priority-columns) hides medium columns at <= 767px and low columns at <= 1023px.
const API = `http://127.0.0.1:${process.env.NOKI_OPS_E2E_API_PORT ?? 4601}`;
const LOCALES = ["fr", "en", "ar"] as const;
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

async function stubRequests(request: APIRequestContext): Promise<Array<{ method: string; pathname: string; status: number; body: Record<string, unknown> | null }>> {
  const response = await request.get(`${API}/__requests`);
  return (await response.json()).requests;
}

const adjustments = async (request: APIRequestContext) => (await stubRequests(request)).filter((r) => r.pathname === "/v1/inventory/stock/adjustments");

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

for (const locale of LOCALES) {
  for (const viewport of VIEWPORTS) {
    test(`inventory: the real adjustment form is reachable and works (${locale} @${viewport.width})`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await loginAsOperations(page, locale);
      await request.post(`${API}/__requests/reset`);
      await page.goto(`/${locale}/inventory`, { waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const compact = viewport.width <= 1279; // dialog action up to 1279px, inline column from 1280px

      let scope;
      if (compact) {
        // Phone/tablet/small laptop: a per-row action opens the same real form in a dialog (the inline column would be hidden or cut off).
        const trigger = page.locator('main button[aria-haspopup="dialog"]').first();
        await expect(trigger).toBeVisible();
        const box = await trigger.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
        await trigger.click();
        scope = page.getByRole("dialog");
        await expect(scope).toBeVisible();
        const dialogBox = await scope.boundingBox();
        expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
        expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width + 1);
        // the dialog names the product it will adjust
        await expect(scope).toContainText("Huile d'argan 250 ml");
      } else {
        // Desktop (>= 1280px): unchanged inline column, and no dialog action.
        await expect(page.locator('main button[aria-haspopup="dialog"]')).toHaveCount(0);
        scope = page.locator("main form").filter({ has: page.locator('input[name="quantity"]') }).first();
        await expect(scope).toBeVisible();
      }

      // Fields are 44px+ and inside the viewport.
      const fields = scope.locator("select, input:not([type=hidden])");
      expect(await fields.count()).toBe(3);
      for (const f of await fields.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { h: r.height, x: r.x, right: r.right }; }))) {
        expect(f.h).toBeGreaterThanOrEqual(43.5);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.right).toBeLessThanOrEqual(viewport.width + 1);
      }

      // Validation: an empty quantity must not reach the API.
      await scope.locator('button[type="submit"]').click();
      await page.waitForTimeout(400);
      expect(await adjustments(request)).toHaveLength(0);

      // Real submission: direction OUT, quantity 5, reason.
      await scope.locator('select[name="type"]').selectOption("ADJUSTMENT_OUT");
      await scope.locator('input[name="quantity"]').fill("5");
      await scope.locator('input[name="reason"]').fill("Casse E2E");
      await scope.locator('button[type="submit"]').click();
      await expect(page.locator('div[role="region"][data-react-aria-top-layer="true"] [role="alert"]').last()).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => (await adjustments(request)).length, { timeout: 15_000 }).toBe(1);
      const sent = (await adjustments(request))[0]!;
      expect(sent.status).toBeLessThan(400);
      expect(sent.body).toMatchObject({ type: "ADJUSTMENT_OUT", quantity: 5, reason: "Casse E2E", productId: "product-local-1", variantId: "variant-local-1", warehouseId: "warehouse-local-1" });
      if (compact) await expect(page.getByRole("dialog")).toHaveCount(0); // closes on success
      await noOverflow(page);
    });
  }
}

test("phone: the dialog can be dismissed without submitting (Escape and close button)", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsOperations(page);
  await request.post(`${API}/__requests/reset`);
  await page.goto("/fr/inventory", { waitUntil: "networkidle" });
  await page.locator('main button[aria-haspopup="dialog"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator('main button[aria-haspopup="dialog"]').first().click();
  await page.getByRole("dialog").getByRole("button", { name: /fermer/i }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await adjustments(request)).toHaveLength(0);
});

// --- Guard: an interactive control may never live only in a column that the responsive table hides ----------------------
const LIST_ROUTES = ["/inbound", "/receiving", "/inventory", "/movements", "/picking", "/packing", "/qc", "/shipping", "/food", "/incidents"];
for (const width of [390, 768, 1024]) {
  test(`tables @${width}: no interactive control is hidden by a responsive column unless the row offers a dialog action`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
    await loginAsOperations(page);
    const failures: string[] = [];
    for (const route of LIST_ROUTES) {
      await page.goto(`/fr${route}`, { waitUntil: "networkidle" });
      const rows = await page.evaluate(() => {
        const out: Array<{ hiddenInteractive: number; hasDialogAction: boolean; visibleRowAction: boolean }> = [];
        for (const tr of document.querySelectorAll("main tbody tr")) {
          let hiddenInteractive = 0;
          for (const cell of tr.querySelectorAll("td")) {
            if (cell.getBoundingClientRect().width > 0) continue;
            hiddenInteractive += cell.querySelectorAll("button, select, textarea, a[href], input:not([type=hidden])").length;
          }
          const visibleControls = [...tr.querySelectorAll<HTMLElement>("a[href], button")].filter((el) => el.getBoundingClientRect().width > 0);
          out.push({ hiddenInteractive, hasDialogAction: visibleControls.some((el) => el.getAttribute("aria-haspopup") === "dialog"), visibleRowAction: visibleControls.length > 0 });
        }
        return out;
      });
      rows.forEach((row, i) => {
        if (row.hiddenInteractive > 0 && !row.hasDialogAction) failures.push(`${route} row ${i}: ${row.hiddenInteractive} hidden control(s) with no visible alternative`);
      });
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

// --- Row actions ("Voir") of every list and the critical actions of every detail page stay visible and in-bounds --------
const LISTS_WITH_VIEW = [
  { route: "/inbound", href: "/inbound/" }, { route: "/picking", href: "/picking/" }, { route: "/packing", href: "/packing/" },
  { route: "/qc", href: "/qc/" }, { route: "/shipping", href: "/shipping/" }, { route: "/food", href: "/food/" }, { route: "/incidents", href: "" },
];
for (const locale of ["fr", "ar"] as const) {
  for (const viewport of VIEWPORTS) {
    test(`lists: the row action is visible, 44px and in bounds (${locale} @${viewport.width})`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await loginAsOperations(page, locale);
      for (const list of LISTS_WITH_VIEW) {
        await page.goto(`/${locale}${list.route}`, { waitUntil: "networkidle" });
        const actions = page.locator("main tbody tr").first().locator(list.href ? `a[href*="${list.href}"]` : "a, button");
        await expect(actions.first(), `${list.route} row action`).toBeVisible();
        const box = await actions.first().boundingBox();
        expect(box?.height ?? 0, list.route).toBeGreaterThanOrEqual(43.5);
        expect(box?.x ?? -1, list.route).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0), list.route).toBeLessThanOrEqual(viewport.width + 1);
        await noOverflow(page);
      }
    });
  }
}

test("phone: following a row action reaches the detail page and its action controls fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsOperations(page);
  for (const [list, detail] of [["/picking", "/picking/"], ["/packing", "/packing/"], ["/qc", "/qc/"], ["/shipping", "/shipping/"], ["/inbound", "/inbound/"]] as const) {
    await page.goto(`/fr${list}`, { waitUntil: "networkidle" });
    await page.locator(`main tbody tr a[href*="${detail}"]`).first().click();
    await page.waitForURL(new RegExp(`${detail}[^/]+$`));
    await expect(page.getByRole("main")).toBeVisible();
    const controls = await page.locator("main form button, main form input:not([type=hidden]), main form select, main form textarea").evaluateAll((els) =>
      els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => { const r = el.getBoundingClientRect(); return { h: r.height, x: r.x, right: r.right, tag: el.tagName }; }),
    );
    for (const c of controls) {
      expect(c.x, `${detail} ${c.tag}`).toBeGreaterThanOrEqual(0);
      expect(c.right, `${detail} ${c.tag}`).toBeLessThanOrEqual(391);
      if (c.tag === "BUTTON" || c.tag === "SELECT") expect(c.h, `${detail} ${c.tag}`).toBeGreaterThanOrEqual(43.5);
    }
    await noOverflow(page);
  }
});
