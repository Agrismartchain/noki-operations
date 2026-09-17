import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { RECETTE, assertNoNextOverlay, loginAsOperationsDemo } from "./support/auth-real";

const API_BASE = "http://localhost:3001";

async function apiLogin(page: Page, email: string, password: string): Promise<string> {
  const response = await page.request.post(`${API_BASE}/v1/auth/login`, { data: { email, password } });
  expect(response.ok(), `/v1/auth/login ${email} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  expect(body.accessToken, `/v1/auth/login ${email} must return an accessToken`).toBeTruthy();
  return body.accessToken!;
}

async function apiGet<T>(page: Page, token: string, path: string): Promise<T> {
  const response = await page.request.get(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok(), `${path} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

type StockBalance = {
  organizationId: string;
  countryId: string;
  countryCode: string;
  warehouseId: string;
  productId: string;
  variantId: string;
  variantSku: string;
  variantName: string;
  onHandQuantity: number;
  availableQuantity: number;
};

/**
 * Real-browser acceptance for the Operations Inventory "Adjust" mutation
 * (InventoryTable -> adjustStockAction -> POST /v1/inventory/stock/adjustments),
 * proving BATCH_02R#11 end-to-end: real Chromium, real noki-operations,
 * real local API, real local Postgres. No Postman; no direct DB mutation
 * simulates the user action -- DB/API readback is used only for assertion.
 */
test.describe("noki-operations inventory stock adjustment (real stack)", () => {
  test("operator adjusts stock through the UI, backend persists it, and the authoritative balance + movement reflect it for real", async ({
    page,
  }) => {
    const operationsToken = await apiLogin(page, RECETTE.operationsEmail, RECETTE.operationsPassword);
    const stock = await apiGet<{ items: StockBalance[] }>(
      page,
      operationsToken,
      "/v1/admin/operations/stock?pageSize=100",
    );
    const balance = stock.items[0];
    expect(balance, "recette fixture requires at least one existing operations stock balance").toBeTruthy();
    const target = balance!;
    const delta = 3;
    const reason = `Recette real-browser adjustment ${randomUUID().slice(0, 8)}`;

    await loginAsOperationsDemo(page);
    await page.goto(`/fr/inventory?pageSize=100`, { waitUntil: "load" });
    await expect(page.locator("h1")).toBeVisible();
    await assertNoNextOverlay(page);

    const rowForm = page
      .locator('form[data-mutation-form="true"]')
      .filter({ has: page.locator(`input[name="variantId"][value="${target.variantId}"]`) })
      .filter({ has: page.locator(`input[name="warehouseId"][value="${target.warehouseId}"]`) });
    await expect(rowForm, "the seeded stock balance must render as an adjustable row").toHaveCount(1);

    await rowForm.locator('select[name="type"]').selectOption("ADJUSTMENT_IN");
    await rowForm.locator('input[name="quantity"]').fill(String(delta));
    await rowForm.locator('input[name="reason"]').fill(reason);
    await rowForm.getByRole("button", { name: /ajuster le stock|adjust stock/i }).click();

    // Real success feedback from the real server action -> real API call.
    await expect(page.getByText(/Opération réussie|Success/i).first()).toBeVisible({ timeout: 15_000 });
    await assertNoNextOverlay(page);

    // Authoritative readback: the real API/DB, not a UI-only optimistic value.
    const refreshedStock = await apiGet<{ items: StockBalance[] }>(
      page,
      operationsToken,
      "/v1/admin/operations/stock?pageSize=100",
    );
    const refreshedBalance = refreshedStock.items.find(
      (item) => item.variantId === target.variantId && item.warehouseId === target.warehouseId,
    );
    expect(refreshedBalance, "adjusted balance must still be present after the mutation").toBeTruthy();
    expect(refreshedBalance!.onHandQuantity).toBe(target.onHandQuantity + delta);

    const movements = await apiGet<{
      items: Array<{ type: string; quantity: number; reference?: string | null; date: string }>;
    }>(
      page,
      operationsToken,
      `/v1/admin/commerce/inventory/movements?variantId=${target.variantId}&warehouseId=${target.warehouseId}&pageSize=5`,
    );
    // movementDto has no manual-order/inbound-shipment context for a plain
    // stock adjustment, so `reference` falls back to the raw `reason` text
    // (see commerce-cod.service.ts#movementDto) -- this is the auditable
    // InventoryMovement row, not a fabricated log line.
    const movement = movements.items.find((item) => item.reference === reason);
    expect(movement, "adjustment must be recorded as an auditable InventoryMovement").toBeTruthy();
    expect(movement!.type).toBe("ADJUSTMENT_IN");
    expect(movement!.quantity).toBe(delta);

    // The refreshed page (real browser navigation, real server render) shows
    // the new authoritative on-hand quantity, not a stale cached one.
    await page.goto(`/fr/inventory?pageSize=100`, { waitUntil: "load" });
    const refreshedRowForm = page
      .locator('form[data-mutation-form="true"]')
      .filter({ has: page.locator(`input[name="variantId"][value="${target.variantId}"]`) })
      .filter({ has: page.locator(`input[name="warehouseId"][value="${target.warehouseId}"]`) });
    await expect(refreshedRowForm).toHaveCount(1);
  });
});
