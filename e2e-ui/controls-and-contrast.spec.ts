import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginAsOperations, setTheme } from "./support/auth";

// Every interactive control >= 44px (fields/selects/buttons/row actions/mobile trigger), no horizontal overflow, field
// borders >= 3:1, small error text >= 4.5:1 — across every Operations route, locale and screen size.
const ROUTES = ["", "/inbound", "/receiving", "/inventory", "/movements", "/picking", "/packing", "/qc", "/shipping", "/food", "/incidents", "/picking/task-local-1", "/packing/task-local-1", "/qc/task-local-1", "/inbound/shipment-local-1", "/shipping/shipment-local-1", "/food/order-local-1"];
const COMBOS = [
  { locale: "fr", width: 1440, height: 900, theme: "dashboard-light" },
  { locale: "ar", width: 768, height: 1024, theme: "dashboard-dark" },
  { locale: "en", width: 390, height: 844, theme: "dashboard-light" },
] as const;

async function sweep(page: Page) {
  return page.evaluate(() => {
    const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: number[]) => { const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
    const ratio = (a: number[], b: number[]) => { const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p); return (hi! + 0.05) / (lo! + 0.05); };
    const backdrop = (el: HTMLElement) => { let n = el.parentElement; while (n) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m[3] === undefined || Number(m[3]) > 0.9)) return parse(c); n = n.parentElement; } return [255, 255, 255]; };
    const small: string[] = [];
    const weakBorders: string[] = [];
    const sel = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, button, [role=button], a[href]';
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === "hidden") continue;
      const tag = el.tagName.toLowerCase();
      if (tag === "a") { const d = getComputedStyle(el).display; if (!/flex|grid|block/.test(d) || r.height > 90) continue; } // inline text links are exempt (WCAG 2.5.8)
      if (tag === "a" && el.closest("nav[aria-label*='ariane' i], nav[aria-label*='readcrumb' i]")) continue;
      if (/_link_/.test(el.className) && el.closest("nav")?.querySelector("ol")) continue;
      if (r.height < 43.5) small.push(`${tag}:${Math.round(r.height)}:${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}`);
      if (/^(input|select|textarea)$/.test(tag)) {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.borderTopWidth) >= 1) {
          const own = parse(cs.backgroundColor);
          const c = Math.min(ratio(parse(cs.borderTopColor), own.length ? own : backdrop(el)), ratio(parse(cs.borderTopColor), backdrop(el)));
          if (c < 3) weakBorders.push(`${tag}:${c.toFixed(2)}`);
        }
      }
    }
    return { small, weakBorders, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, objectObject: document.body.innerText.includes("[object Object]") };
  });
}

for (const combo of COMBOS) {
  test(`controls >= 44px, borders >= 3:1, no overflow, nothing hidden (${combo.locale} ${combo.theme.replace("dashboard-", "")} @${combo.width})`, async ({ page }) => {
    test.setTimeout(240_000);
    await setTheme(page, combo.theme);
    await page.setViewportSize({ width: combo.width, height: combo.height });
    await loginAsOperations(page);
    const failures: string[] = [];
    for (const route of ROUTES) {
      await page.goto(`/${combo.locale}${route}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForTimeout(250);
      const r = await sweep(page);
      if (r.small.length) failures.push(`${route || "/"}: small ${r.small.slice(0, 3).join(", ")}`);
      if (r.weakBorders.length) failures.push(`${route || "/"}: weak borders ${r.weakBorders.slice(0, 3).join(", ")}`);
      if (r.overflow > 0) failures.push(`${route || "/"}: horizontal overflow ${r.overflow}px`);
      if (r.objectObject) failures.push(`${route || "/"}: [object Object] rendered`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

// --- field-border and error-text contrast on the login card, per state -------------------------------------------------
async function contrastOf(field: Locator, prop: "borderTopColor" | "outlineColor" | "color") {
  return field.evaluate((el, p) => {
    const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: number[]) => { const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
    const ratio = (a: number[], b: number[]) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };
    const bg = (node: HTMLElement | null): number[] => { let n = node; while (n) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m[3] === undefined || Number(m[3]) > 0.9)) return parse(c); n = n.parentElement; } return [255, 255, 255]; };
    const cs = getComputedStyle(el as HTMLElement);
    const own = parse(cs.backgroundColor);
    const outer = bg((el as HTMLElement).parentElement);
    const color = parse(cs[p as "color"]);
    return p === "color" ? ratio(color, outer) : Math.min(ratio(color, own.length ? own : outer), ratio(color, outer));
  }, prop);
}

for (const theme of ["dashboard-light", "dashboard-dark"] as const) {
  for (const locale of ["fr", "ar"] as const) {
    test(`login fields: border >= 3:1 idle/hover/focus, error border stays danger, error text >= 4.5:1 (${theme.replace("dashboard-", "")}, ${locale})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
      const password = page.locator('main input[type="password"]');
      expect(await contrastOf(password, "borderTopColor"), "idle border").toBeGreaterThanOrEqual(3);
      await password.hover();
      expect(await contrastOf(password, "borderTopColor"), "hover border").toBeGreaterThanOrEqual(3);
      await page.mouse.move(0, 0);
      await password.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      expect(await password.evaluate((el) => getComputedStyle(el).outlineStyle), "focus indicator").not.toBe("none");
      expect(await contrastOf(password, "outlineColor"), "focus ring").toBeGreaterThanOrEqual(3);

      await page.locator('main button[type="submit"]').click();
      const email = page.locator('main input[type="email"]');
      await expect(email).toHaveAttribute("aria-invalid", "true");
      const dangerRgb = await page.evaluate(() => { const d = document.createElement("div"); d.style.color = "var(--noki-color-semantic-danger)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
      expect(await email.evaluate((el) => getComputedStyle(el).borderTopColor), "error border is the DS danger colour").toBe(dangerRgb);
      await email.hover();
      expect(await email.evaluate((el) => getComputedStyle(el).borderTopColor), "error border survives hover").toBe(dangerRgb);
      const messages = page.locator('main [class*="_error_"]');
      expect(await messages.count()).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < (await messages.count()); i += 1) expect(await contrastOf(messages.nth(i), "color"), "error text").toBeGreaterThanOrEqual(4.5);
    });
  }
}
