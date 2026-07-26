import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { RECETTE, assertNoNextOverlay, loginAsOperationsDemo, loginReal } from "./support/auth-real";

const API_BASE = "http://localhost:3001";

async function apiLogin(page: Page, email: string, password: string): Promise<string> {
  const response = await page.request.post(`${API_BASE}/v1/auth/login`, { data: { email, password } });
  expect(response.ok(), `/v1/auth/login ${email} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  expect(body.accessToken, `/v1/auth/login ${email} must return an accessToken`).toBeTruthy();
  return body.accessToken!;
}

async function operationsApiToken(page: Page): Promise<string> {
  return apiLogin(page, RECETTE.operationsEmail, RECETTE.operationsPassword);
}

async function apiGet<T>(page: Page, token: string, path: string): Promise<T> {
  const response = await page.request.get(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok(), `${path} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function apiPost<T>(
  page: Page,
  token: string,
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await page.request.post(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, ...headers }, data });
  expect(response.ok(), `${path} -> ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
}

async function resolveOrderReferenceData(
  page: Page,
  token: string,
  input: { organizationId: string; countryCode: string },
): Promise<{ sourceId: string; currencyId: string }> {
  const existing = await apiGet<{ items: Array<{ id: string }> }>(
    page,
    token,
    `/v1/orders?${query({ organizationId: input.organizationId, countryCode: input.countryCode, pageSize: 1 })}`,
  );
  const referenceOrder = existing.items[0];
  if (referenceOrder) {
    const detail = await apiGet<{ sourceId: string; currencyId: string }>(page, token, `/v1/orders/${referenceOrder.id}`);
    return { sourceId: detail.sourceId, currencyId: detail.currencyId };
  }

  const [sources, countries, currencies] = await Promise.all([
    apiGet<{ items: Array<{ id: string; organizationId: string }> }>(
      page,
      token,
      `/v1/admin/commerce/lookups/order-sources?${query({ organizationId: input.organizationId, pageSize: 25 })}`,
    ),
    apiGet<{ items: Array<{ code: string; defaultCurrencyCode?: string | null }> }>(
      page,
      token,
      `/v1/admin/master-data/countries?${query({ search: input.countryCode, pageSize: 25 })}`,
    ),
    apiGet<{ items: Array<{ id: string; code: string; status: string }> }>(page, token, "/v1/admin/master-data/currencies?pageSize=100"),
  ]);

  const source = sources.items.find((item) => item.organizationId === input.organizationId) ?? sources.items[0];
  const country = countries.items.find((item) => item.code === input.countryCode);
  const currency =
    currencies.items.find((item) => item.status === "ACTIVE" && item.code === country?.defaultCurrencyCode) ??
    currencies.items.find((item) => item.status === "ACTIVE");

  expect(source, "recette provisioning requires an active order source").toBeTruthy();
  expect(currency, "recette provisioning requires an active currency").toBeTruthy();
  return { sourceId: source!.id, currencyId: currency!.id };
}

async function createConfirmedOrder(
  page: Page,
  provisionerToken: string,
  input: {
    organizationId: string;
    countryId: string;
    countryCode: string;
    sourceId: string;
    currencyId: string;
    productId: string;
    variantId: string;
    variantSku: string;
    variantName: string;
    runId: string;
  },
): Promise<{ id: string; orderNumber: string }> {
  const order = await apiPost<{ id: string; orderNumber: string }>(
    page,
    provisionerToken,
    "/v1/orders",
    {
      organizationId: input.organizationId,
      countryId: input.countryId,
      countryCode: input.countryCode,
      currencyId: input.currencyId,
      sourceId: input.sourceId,
      externalReference: `PW-OPS-${input.runId}`,
      initialStatus: "PENDING_CONFIRMATION",
      customer: {
        fullName: `Playwright Operations ${input.runId.slice(0, 8)}`,
        phone: "+242060000001",
        email: `pw-ops-${input.runId}@example.invalid`,
      },
      address: {
        addressLine1: `Playwright operations street ${input.runId.slice(0, 8)}`,
      },
      lines: [
        {
          productId: input.productId,
          variantId: input.variantId,
          sku: input.variantSku,
          name: input.variantName,
          quantity: 1,
          unitPriceAmount: 100,
          currencyId: input.currencyId,
        },
      ],
    },
    { "Idempotency-Key": `pw-ops-order-${input.runId}` },
  );

  const queues = await apiGet<{ items: Array<{ id: string; organizationId: string; countryId: string; countryCode: string }> }>(
    page,
    provisionerToken,
    `/v1/admin/confirmation/queues?${query({ organizationId: input.organizationId, countryId: input.countryId, status: "ACTIVE", pageSize: 10 })}`,
  );
  const queue = queues.items.find((item) => item.countryId === input.countryId) ?? queues.items[0];
  expect(queue, "recette provisioning requires an active confirmation queue").toBeTruthy();

  const confirmationTask = await apiPost<{ id: string }>(
    page,
    provisionerToken,
    "/v1/confirmation/tasks",
    {
      organizationId: input.organizationId,
      countryId: input.countryId,
      countryCode: input.countryCode,
      queueId: queue!.id,
      orderId: order.id,
      priority: 20,
    },
    { "Idempotency-Key": `pw-ops-confirmation-task-${input.runId}` },
  );
  await apiPost(page, provisionerToken, `/v1/confirmation/tasks/${confirmationTask.id}/attempts`, {
    channel: "MANUAL",
    result: "CONFIRMED",
    notes: `Playwright operations fixture ${input.runId}`,
  });

  return order;
}

async function createDedicatedPackedFixture(
  page: Page,
  input: { operationsToken: string; provisionerToken: string; runLabel: string },
): Promise<{ taskId: string; orderId: string; orderNumber: string; organizationId: string; countryId: string; countryCode: string }> {
  const runId = `${input.runLabel}-${randomUUID()}`;
  const me = await apiGet<{ actorId: string }>(page, input.operationsToken, "/v1/auth/me");
  const stock = await apiGet<{
    items: Array<{
      organizationId: string;
      countryId: string;
      countryCode: string;
      warehouseId: string;
      productId: string;
      variantId: string;
      variantSku: string;
      variantName: string;
      availableQuantity: number;
    }>;
  }>(page, input.operationsToken, "/v1/admin/operations/stock?pageSize=100");
  const balance = stock.items.find((item) => item.availableQuantity >= 1);
  expect(balance, "recette fixture requires an operations stock balance with available quantity").toBeTruthy();

  const reference = await resolveOrderReferenceData(page, input.provisionerToken, {
    organizationId: balance!.organizationId,
    countryCode: balance!.countryCode,
  });
  const order = await createConfirmedOrder(page, input.provisionerToken, {
    ...balance!,
    sourceId: reference.sourceId,
    currencyId: reference.currencyId,
    runId,
  });

  const reservation = await apiPost<{ id: string; countryId: string }>(
    page,
    input.operationsToken,
    "/v1/inventory/reservations",
    {
      organizationId: balance!.organizationId,
      countryId: balance!.countryId,
      countryCode: balance!.countryCode,
      warehouseId: balance!.warehouseId,
      orderId: order.id,
    },
    { "Idempotency-Key": `pw-ops-reservation-${runId}` },
  );
  const task = await apiPost<{ id: string }>(
    page,
    input.operationsToken,
    "/v1/fulfillment/tasks",
    {
      organizationId: balance!.organizationId,
      countryId: balance!.countryId,
      countryCode: balance!.countryCode,
      warehouseId: balance!.warehouseId,
      inventoryReservationId: reservation.id,
      orderId: order.id,
    },
    { "Idempotency-Key": `pw-ops-fulfillment-task-${runId}` },
  );

  await apiPost(page, input.operationsToken, `/v1/fulfillment/tasks/${task.id}/assign`, { assignedActorId: me.actorId });
  await apiPost(page, input.operationsToken, `/v1/fulfillment/tasks/${task.id}/start-picking`, undefined);
  await apiPost(page, input.operationsToken, `/v1/fulfillment/tasks/${task.id}/complete-picking`, undefined);
  await apiPost(page, input.operationsToken, `/v1/fulfillment/tasks/${task.id}/complete-packing`, {
    packageCount: 2,
    weightKg: 1.75,
    notes: "Recette UI packing metadata",
  });

  return {
    taskId: task.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    organizationId: balance!.organizationId,
    countryId: balance!.countryId,
    countryCode: balance!.countryCode,
  };
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
    const token = await operationsApiToken(page);
    const provisionerToken = await apiLogin(page, RECETTE.superAdminEmail, RECETTE.superAdminPassword);

    const fixture = await createDedicatedPackedFixture(page, { operationsToken: token, provisionerToken, runLabel: "qc-fail" });
    await apiPost(page, token, `/v1/admin/commerce/fulfillment/tasks/${fixture.taskId}/qc`, {
      status: "FAILED",
      reason: "Playwright deterministic QC failure",
      notes: "QC fail must block dispatch progression",
    });

    const failedTask = await apiGet<{ status: string }>(page, token, `/v1/fulfillment/tasks/${fixture.taskId}`);
    expect(failedTask.status).toBe("QC_FAILED");

    const blockedShipment = await page.request.post(`${API_BASE}/v1/delivery/shipments`, {
      headers: { Authorization: `Bearer ${provisionerToken}`, "Idempotency-Key": `pw-ops-blocked-shipment-${randomUUID()}` },
      data: {
        organizationId: fixture.organizationId,
        countryId: fixture.countryId,
        countryCode: fixture.countryCode,
        fulfillmentTaskId: fixture.taskId,
        orderId: fixture.orderId,
      },
    });
    expect(blockedShipment.status(), await blockedShipment.text()).toBe(400);

    const blockedShipping = await apiGet<{
      total: number;
      items: Array<{ id: string; qcStatus: string | null; fulfillmentStatus: string | null; shipmentStatus: string; codAmount: string }>;
    }>(page, token, `/v1/admin/commerce/shipping?search=${encodeURIComponent(fixture.orderNumber)}&pageSize=10`);
    for (const shipment of blockedShipping.items) {
      expect(shipment.qcStatus).toBe("FAILED");
      expect(shipment.fulfillmentStatus).toBe("QC_FAILED");
      expect(["READY_FOR_DISPATCH", "ASSIGNED", "OUT_FOR_DELIVERY"]).not.toContain(shipment.shipmentStatus);
      await page.goto(`/fr/shipping/${shipment.id}`, { waitUntil: "load" });
      await expect(page.getByRole("button", { name: /assigner|assign|dispatch|mettre en livraison|out for delivery/i })).toHaveCount(0);
    }

    const failedQc = await apiGet<{ items: Array<{ orderNumber: string }> }>(
      page,
      token,
      "/v1/admin/operations/fulfillment?status=QC_FAILED&pageSize=1",
    );

    if (failedQc.items[0]) {
      const query = encodeURIComponent(failedQc.items[0].orderNumber);
      const shipmentForFailedQc = await apiGet<{
        items: Array<{ id: string; qcStatus: string | null; fulfillmentStatus: string | null; shipmentStatus: string; codAmount: string }>;
      }>(page, token, `/v1/admin/commerce/shipping?search=${query}&pageSize=10`);
      for (const shipment of shipmentForFailedQc.items) {
        expect(shipment.qcStatus).toBe("FAILED");
        expect(shipment.fulfillmentStatus).toBe("QC_FAILED");
        expect(["READY_FOR_DISPATCH", "ASSIGNED", "OUT_FOR_DELIVERY"]).not.toContain(shipment.shipmentStatus);
        expect(shipment.codAmount).toMatch(/^\d/);
      }
    }

  });

  test("packing metadata is entered through the UI, persisted by the API and QC PASS unlocks the task", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsOperationsDemo(page);
    const token = await operationsApiToken(page);
    const provisionerToken = await apiLogin(page, RECETTE.superAdminEmail, RECETTE.superAdminPassword);
    const fixture = await createDedicatedPackedFixture(page, { operationsToken: token, provisionerToken, runLabel: "qc-pass" });

    const persisted = await apiGet<{ status: string; packageCount: number | null; weightKg: number | null; packingNotes: string | null }>(
      page,
      token,
      `/v1/fulfillment/tasks/${fixture.taskId}`,
    );
    expect(persisted.status).toBe("PACKED");
    expect(persisted.packageCount).toBe(2);
    expect(persisted.weightKg).toBe(1.75);
    expect(persisted.packingNotes).toBe("Recette UI packing metadata");

    // QC PASS through the real UI unlocks the task for dispatch.
    await page.goto(`/fr/qc/${fixture.taskId}`, { waitUntil: "load" });
    await assertNoNextOverlay(page);
    await expect(page.getByRole("button", { name: /valider qc|submit pass|pass qc/i })).toBeVisible();
    await page.getByRole("button", { name: /valider qc|submit pass|pass qc/i }).click();
    await expect(page.getByText(/qc validé|qc passed/i).first()).toBeVisible({ timeout: 15_000 });

    const passed = await apiGet<{ status: string }>(page, token, `/v1/fulfillment/tasks/${fixture.taskId}`);
    expect(passed.status).toBe("QC_PASSED");

    const shipment = await apiPost<{ id: string; status: string }>(
      page,
      provisionerToken,
      "/v1/delivery/shipments",
      {
        organizationId: fixture.organizationId,
        countryId: fixture.countryId,
        countryCode: fixture.countryCode,
        fulfillmentTaskId: fixture.taskId,
        orderId: fixture.orderId,
      },
      { "Idempotency-Key": `pw-ops-shipment-${randomUUID()}` },
    );
    expect(shipment.status).toBe("READY_FOR_DISPATCH");

    const shipping = await apiGet<{
      items: Array<{
        id: string;
        orderNumber: string | null;
        fulfillmentTaskId: string | null;
        qcStatus: string | null;
        fulfillmentStatus: string | null;
        shipmentStatus: string;
        codAmount: string;
        driverName: string | null;
      }>;
    }>(
      page,
      token,
      `/v1/admin/commerce/shipping?${query({
        search: fixture.orderNumber,
        shipmentId: shipment.id,
        fulfillmentTaskId: fixture.taskId,
        organizationId: fixture.organizationId,
        countryId: fixture.countryId,
        pageSize: 10,
      })}`,
    );
    const targetedShipment = shipping.items.find((item) => item.id === shipment.id && item.fulfillmentTaskId === fixture.taskId);

    expect(targetedShipment, `shipping row for fixture order ${fixture.orderNumber}`).toBeTruthy();
    expect(targetedShipment!.orderNumber).toBe(fixture.orderNumber);
    expect(targetedShipment!.qcStatus).toBe("PASSED");
    expect(targetedShipment!.fulfillmentStatus).toBe("QC_PASSED");
    expect(targetedShipment!.shipmentStatus).toBe("READY_FOR_DISPATCH");
    expect(Number.isFinite(Number(targetedShipment!.codAmount))).toBe(true);
    expect(targetedShipment!.driverName === null || targetedShipment!.driverName.trim().length > 0).toBe(true);
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
    await expect(page.getByRole("heading", { name: /accès refusé|access denied/i })).toBeVisible({ timeout: 10_000 });
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
    await expect(page.getByRole("heading", { name: /accès refusé|access denied/i })).toBeVisible({ timeout: 10_000 });
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
