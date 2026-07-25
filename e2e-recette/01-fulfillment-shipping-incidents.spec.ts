import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { RECETTE, assertNoNextOverlay, loginAsOperationsDemo, loginReal } from "./support/auth-real";

const API_BASE = "http://localhost:3001";

async function accessToken(page: Page): Promise<string> {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "noki_access_token")?.value;
  if (!token) throw new Error("noki_access_token cookie not found");
  return token;
}

async function apiGet<T>(page: Page, token: string, path: string): Promise<T> {
  const response = await page.request.get(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok(), `${path} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function openFirstRowDetail(page: Page, route: string) {
  await page.goto(route, { waitUntil: "load" });
  await expect(page.locator("h1")).toBeVisible();
  await assertNoNextOverlay(page);

  const action = page.getByRole("link", { name: /voir|view/i }).first();
  if (await action.isVisible().catch(() => false)) {
    await action.click();
    await expect(page.locator("main")).toBeVisible();
    await assertNoNextOverlay(page);
  }
}

test.describe("noki-operations fulfillment, shipping and incidents (real stack)", () => {
  test("picking, packing, QC, shipping and incidents routes render real workflows with no coming-soon placeholders", async ({ page }) => {
    await loginAsOperationsDemo(page);

    for (const route of ["/fr/picking", "/fr/packing", "/fr/qc", "/fr/shipping", "/fr/incidents"]) {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("h1")).toBeVisible();
      await assertNoNextOverlay(page);
      await expect(page.getByText(/bientôt disponible|coming soon/i)).toHaveCount(0);
    }
  });

  test("list -> detail flows are wired for picking, packing, QC and shipping when demo data exists", async ({ page }) => {
    await loginAsOperationsDemo(page);

    await openFirstRowDetail(page, "/fr/picking");
    await openFirstRowDetail(page, "/fr/packing");
    await openFirstRowDetail(page, "/fr/qc");
    await openFirstRowDetail(page, "/fr/shipping");
  });

  test("QC fail blocks shipping and shipping rows expose QC/COD/driver context", async ({ page }) => {
    await loginAsOperationsDemo(page);
    const token = await accessToken(page);

    const failedQc = await apiGet<{ items: Array<{ orderNumber: string }> }>(
      page,
      token,
      "/v1/admin/operations/fulfillment?status=QC_FAILED&pageSize=1",
    );

    if (failedQc.items[0]) {
      const query = encodeURIComponent(failedQc.items[0].orderNumber);
      const shipmentForFailedQc = await apiGet<{ total: number }>(page, token, `/v1/admin/commerce/shipping?search=${query}&pageSize=1`);
      expect(shipmentForFailedQc.total).toBe(0);
    }

    const shipping = await apiGet<{ items: Array<{ qcStatus: string | null; codAmount: string; driverName: string | null }> }>(
      page,
      token,
      "/v1/admin/commerce/shipping?pageSize=10",
    );
    for (const shipment of shipping.items) {
      expect(shipment.qcStatus).toBe("PASSED");
      expect(shipment.codAmount).toMatch(/^\d/);
    }
  });

  test("packing metadata is entered through the UI, persisted by the API and QC PASS unlocks the task", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsOperationsDemo(page);
    const token = await accessToken(page);

    // Build a real fulfillment task on a CONFIRMED demo order that has no ACTIVE
    // reservation yet. The demo dataset ships several; each run consumes one and a
    // demo reseed restores them. No fixture data is fabricated by the test itself.
    const scope = await apiGet<{ items: Array<{ organizationId: string; countryId: string; countryCode: string; warehouseId: string }> }>(
      page,
      token,
      "/v1/admin/operations/fulfillment?pageSize=1",
    );
    const organizationId = scope.items[0]?.organizationId;
    const countryCode = scope.items[0]?.countryCode;
    const warehouseId = scope.items[0]?.warehouseId;
    expect(organizationId && countryCode && warehouseId, "demo fulfillment scope must exist").toBeTruthy();

    const confirmed = await apiGet<{ items: Array<{ id: string; orderNumber: string; countryId: string }> }>(
      page,
      token,
      `/v1/orders?organizationId=${organizationId}&countryCode=${countryCode}&status=CONFIRMED&pageSize=50`,
    );

    let reservation: { id: string; countryId: string; createdByActorId: string } | null = null;
    let orderId = "";
    for (const order of confirmed.items) {
      const attempt = await page.request.post(`${API_BASE}/v1/inventory/reservations`, {
        headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `recette-res-${randomUUID()}` },
        data: { organizationId, countryId: order.countryId, countryCode, warehouseId, orderId: order.id },
      });
      if (attempt.status() === 201) {
        reservation = (await attempt.json()) as { id: string; countryId: string; createdByActorId: string };
        orderId = order.id;
        break;
      }
    }
    expect(reservation, "no CONFIRMED demo order without an ACTIVE reservation remains; reseed the demo dataset").toBeTruthy();

    const taskResponse = await page.request.post(`${API_BASE}/v1/fulfillment/tasks`, {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `recette-task-${randomUUID()}` },
      data: {
        organizationId,
        countryId: reservation!.countryId,
        countryCode,
        warehouseId,
        inventoryReservationId: reservation!.id,
        orderId,
      },
    });
    expect(taskResponse.status(), await taskResponse.text()).toBe(201);
    const task = (await taskResponse.json()) as { id: string };

    const post = (path: string, data?: unknown) =>
      page.request.post(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, data });
    expect((await post(`/v1/fulfillment/tasks/${task.id}/assign`, { assignedActorId: reservation!.createdByActorId })).status()).toBe(200);
    expect((await post(`/v1/fulfillment/tasks/${task.id}/start-picking`)).status()).toBe(200);
    expect((await post(`/v1/fulfillment/tasks/${task.id}/complete-picking`)).status()).toBe(200);

    // The packing step itself is driven through the real UI form.
    await page.goto(`/fr/packing/${task.id}`, { waitUntil: "load" });
    await assertNoNextOverlay(page);
    await page.getByLabel(/nombre de colis|package count/i).fill("2");
    await page.getByLabel(/poids total|total weight/i).fill("1.75");
    await page.getByLabel(/notes de packing|packing notes/i).fill("Recette UI packing metadata");
    await page.getByRole("button", { name: /terminer le packing|complete packing/i }).click();

    await expect(page.getByText(/emballée|packed/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("1.75 kg")).toBeVisible();
    await expect(page.getByText("Recette UI packing metadata")).toBeVisible();

    const persisted = await apiGet<{ status: string; packageCount: number | null; weightKg: number | null; packingNotes: string | null }>(
      page,
      token,
      `/v1/fulfillment/tasks/${task.id}`,
    );
    expect(persisted.status).toBe("PACKED");
    expect(persisted.packageCount).toBe(2);
    expect(persisted.weightKg).toBe(1.75);
    expect(persisted.packingNotes).toBe("Recette UI packing metadata");

    // QC PASS through the real UI unlocks the task for dispatch.
    await page.goto(`/fr/qc/${task.id}`, { waitUntil: "load" });
    await assertNoNextOverlay(page);
    await page.getByRole("button", { name: /valider le qc|submit pass|passer le qc/i }).click();
    await expect(page.getByText(/qc validé|qc passed/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("mobile 390px: topbar controls remain reachable with no horizontal overflow", async ({ page }) => {
    await loginAsOperationsDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of ["/fr/picking", "/fr/packing", "/fr/qc", "/fr/shipping", "/fr/incidents"]) {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("button", { name: /se déconnecter|sign out/i })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    }
  });

  test("app-level denial blocks non-operations accounts before shell navigation", async ({ page }) => {
    await loginReal(page, RECETTE.contactCenterEmail, RECETTE.contactCenterPassword);
    await page.goto("/fr", { waitUntil: "load" });
    await expect(page.getByText(/accès refusé|access denied/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("authorization policy: operations accepted, finance denied, auditor read-only and super-admin accepted", async ({ page }) => {
    await loginAsOperationsDemo(page);
    await page.goto("/fr", { waitUntil: "load" });
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();

    await page.context().clearCookies();
    await loginReal(page, RECETTE.financeEmail, RECETTE.financePassword);
    await page.goto("/fr", { waitUntil: "load" });
    await expect(page.getByText(/accès refusé|access denied/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("navigation")).toHaveCount(0);

    await page.context().clearCookies();
    await loginReal(page, RECETTE.auditorEmail, RECETTE.auditorPassword);
    await page.goto("/fr/packing", { waitUntil: "load" });
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("button", { name: /terminer le packing|complete packing/i })).toHaveCount(0);

    await page.context().clearCookies();
    await loginReal(page, RECETTE.superAdminEmail, RECETTE.superAdminPassword);
    await page.goto("/fr", { waitUntil: "load" });
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("screenshots: workflow finals, mobile, dark mode and Arabic RTL", async ({ page }) => {
    await loginAsOperationsDemo(page);

    const shots = [
      ["/fr/picking", "operations-picking-final.png"],
      ["/fr/packing", "operations-packing-final.png"],
      ["/fr/qc", "operations-qc-final.png"],
      ["/fr/shipping", "operations-shipping-final.png"],
      ["/fr/incidents", "operations-incidents-final.png"],
    ] as const;

    for (const [route, name] of shots) {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e-recette/screenshots/${name}`, fullPage: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fr/shipping", { waitUntil: "load" });
    await expect(page.locator("h1")).toBeVisible();
    await page.screenshot({ path: "e2e-recette/screenshots/operations-mobile-final.png", fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    const themeToggle = page.getByRole("button", { name: /sombre|dark|clair|light/i }).first();
    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(200);
    }
    await page.goto("/fr/shipping", { waitUntil: "load" });
    await page.screenshot({ path: "e2e-recette/screenshots/operations-dark-final.png", fullPage: true });

    await page.goto("/ar/shipping", { waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: "e2e-recette/screenshots/operations-ar-rtl-final.png", fullPage: true });
  });
});
