import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openApiPath = resolve(__dirname, "../../node_modules/@agrismartchain/noki-shared-contracts/spec/openapi/noki-api.openapi.json");
const registryPath = resolve(__dirname, "../../src/domains/registry.ts");
const openApi = JSON.parse(readFileSync(openApiPath, "utf8"));
const schemas = openApi.components?.schemas ?? {};
const port = Number(process.argv[2] ?? process.env.PORT ?? 4601);
const now = "2026-07-22T12:00:00.000Z";
const requestLog = [];
// Phase 21: restaurant-partner invitation bridge stub state, keyed by
// restaurantId -- lets a Playwright test invite a partner and then see the
// resulting pending invitation reflected back by the GET route.
let partnerAccessByRestaurant = {};

const registrySource = readFileSync(registryPath, "utf8");
const registryCapabilities = [...new Set([...registrySource.matchAll(/capability:\s*"([^"]+)"/g)].map((match) => match[1]))];

const capabilitySet = [
  ...registryCapabilities,
  // Operations: management capabilities that gate forms and row actions (not in the navigation registry).
  "commerce.inbound.manage",
  "commerce.qc.manage",
  "delivery.shipment.assign",
  "fulfillment.task.assign",
  "inventory.stock.adjust",
  "analytics.admin.read",
  "auth.me.read",
  "users.read",
  "users.create",
  "users.update",
  "invitations.read",
  "invitations.create",
  "invitations.update",
  "memberships.read",
  "memberships.create",
  "memberships.update",
  "teams.read",
  "teams.create",
  "teams.update",
  "roles.read",
  "roles.update",
  "permissions.read",
  "sessions.read",
  "sessions.revoke",
  "security.mfa.admin",
  "organizations.read",
  "organizations.create",
  "organizations.update",
  "countries.read",
  "currencies.read",
  "languages.read",
  "scopes.read",
  "scopes.update",
  "zones.read",
  "zones.update",
  "warehouses.read",
  "warehouses.create",
  "warehouses.update",
  "catalog.products.read",
  "catalog.products.approve",
  "catalog.offers.read",
  "catalog.offers.approve",
  "commissions.read",
  "commissions.create",
  "commissions.update",
  "orders.read",
  "orders.timeline.read",
  "hotline.read",
  "confirmation.task.read",
  "orders.exceptions.read",
  "operations.read",
  "inventory.read",
  "fulfillment.read",
  "delivery.admin.read",
  "delivery.qr.admin",
  "delivery.location.admin.read",
  "delivery.incident.resolve",
  "incidents.read",
  "finance.executive.read",
  "finance.payouts.read",
  "finance.expenses.read",
  "finance.margin.read",
  "finance.currencies.read",
  "automation.read",
  "automation.update",
  "automation.kill_switch.update",
  "ai.read",
  "ai.review",
  "ai.admin",
  "integrations.provider.read",
  "integrations.connection.read",
  "integrations.connection.write",
  "integrations.connection.update",
  "integrations.webhook.read",
  "integrations.webhook.write",
  "integrations.webhook.update",
  "integrations.delivery.read",
  "integrations.contract.read",
  "api_clients.read",
  "api_clients.update",
  "settings.read",
  "settings.update",
  "feature_flags.read",
  "feature_flags.update",
  "audit.read",
  "approvals.read",
  "approvals.approve",
  "approvals.reject",
  "sensitive_exports.read",
  "sensitive_exports.create",
  "sensitive_access.read",
  "food.analytics.read",
  "food.restaurant.read",
  "food.restaurant.manage",
  "food.onboarding.review",
  "food.menu.read",
  "food.menu.manage",
  "food.order.read",
  "food.order.manage",
  "food.zone.read",
  "food.zone.manage",
  "food.quality.read",
  "food.quality.manage",
].sort();

function resolveRef(ref) {
  const name = ref.replace("#/components/schemas/", "");
  return schemas[name] ?? {};
}

function materialize(schema, path = "root", depth = 0) {
  if (!schema || depth > 10) return stringValue(path);
  if (schema.nullable === true) return null; // OpenAPI 3.0 nullable fields: null, never a fabricated object
  if (schema.$ref) return materialize(resolveRef(schema.$ref), path, depth + 1);
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map((item) => materialize(item, path, depth + 1)));
  if (schema.oneOf) return materialize(schema.oneOf[0], path, depth + 1);
  if (schema.anyOf) return materialize(schema.anyOf[0], path, depth + 1);

  if (schema.enum?.length) return schema.enum[0];

  const type = Array.isArray(schema.type) ? schema.type.find((item) => item !== "null") : schema.type;
  if (type === "array") {
    return [materialize(schema.items ?? {}, `${path}.0`, depth + 1)];
  }
  if (type === "number" || type === "integer") return numericValue(path);
  if (type === "boolean") return false;
  if (type === "string" || schema.format) return stringValue(path);
  // The generated spec types nullable strings/dates as a bare `{ "type": "object" }`: a property-less object schema is
  // materialized as null (the real API returns string | null there), never as a fabricated `{}` that React cannot render.
  if (type === "object" && !schema.properties && !schema.additionalProperties) return null;
  if (type === "object" || schema.properties) {
    const output = {};
    const properties = schema.properties ?? {};
    for (const [key, value] of Object.entries(properties)) {
      output[key] = materialize(value, `${path}.${key}`, depth + 1);
    }
    return output;
  }
  return stringValue(path);
}

function numericValue(path) {
  const key = path.split(".").at(-1) ?? "";
  if (/page$/i.test(key)) return 1;
  if (/pageSize$/i.test(key)) return 20;
  if (/total|count|entries|workflows|agents|reviews|quotas|tokens|attempts|shipments|warehouses|members|roles|permissions/i.test(key)) return 3;
  if (/percent|rollout/i.test(key)) return 50;
  if (/amount|margin|credits|debits|cashflow|expected|collected|remitted|fees|payouts|expenses/i.test(key)) return 1250;
  if (/duration|minutes|seconds/i.test(key)) return 15;
  return 1;
}

function stringValue(path) {
  const key = path.split(".").at(-1) ?? "";
  if (/id$/i.test(key)) return `${key.replace(/Id$/i, "").toLowerCase() || "id"}-local-1`;
  if (/email/i.test(key)) return "super.admin@local.noki.test";
  if (/phone/i.test(key)) return "+212 ******000";
  if (/countryCode/i.test(key)) return "MA";
  if (/currencyCode/i.test(key)) return "MAD";
  if (/direction/i.test(key)) return "LTR";
  if (/status/i.test(key)) return "ACTIVE";
  if (/type/i.test(key)) return "STANDARD";
  if (/locale/i.test(key)) return "fr";
  if (/url|link/i.test(key)) return "https://local.noki.test/webhook";
  if (/checksum/i.test(key)) return "9b68f13a194ef7c11db0c5b7b9ad3018964e2b7c799a38ae840c3a33f24f297e";
  if (/date|at$|start|end|expires/i.test(key)) return now;
  if (/amount|rate|percent|value/i.test(key)) return "1250.00";
  if (/code/i.test(key)) return "LOCAL";
  if (/name|title|subject|summary|description|reason|purpose|message/i.test(key)) return "Local test";
  if (/password/i.test(key)) return "local-password";
  if (/token/i.test(key)) return "stub-token";
  return "Local test";
}

function responseSchema(operation) {
  const response = operation.responses?.["200"] ?? operation.responses?.["201"] ?? operation.responses?.["202"] ?? operation.responses?.default;
  return response?.content?.["application/json"]?.schema;
}

function compileRoute(openApiPath, method, operation) {
  const keys = [];
  const pattern = openApiPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{([^}]+)\\\}/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  return {
    method: method.toUpperCase(),
    operationId: operation.operationId,
    regex: new RegExp(`^${pattern}$`),
    keys,
    schema: responseSchema(operation),
  };
}

const routes = Object.entries(openApi.paths).flatMap(([path, operations]) =>
  Object.entries(operations).map(([method, operation]) => compileRoute(path, method, operation)),
);

function authPayload(isAuditor = false) {
  const capabilities = isAuditor
    ? [
        "auth.me.read",
        "analytics.admin.read",
        "orders.read",
        "orders.timeline.read",
        "users.read",
        "invitations.read",
        "memberships.read",
        "teams.read",
        "roles.read",
        "permissions.read",
        "sessions.read",
        "organizations.read",
        "countries.read",
        "scopes.read",
        "zones.read",
        "warehouses.read",
        "catalog.products.read",
        "catalog.offers.read",
        "commissions.read",
        "operations.read",
        "inventory.read",
        "fulfillment.read",
        "delivery.admin.read",
        "delivery.qr.admin",
        "delivery.location.admin.read",
        "incidents.read",
        "approvals.read",
        "sensitive_exports.read",
        "integrations.provider.read",
        "integrations.connection.read",
        "integrations.webhook.read",
        "integrations.delivery.read",
        "integrations.contract.read",
        "api_clients.read",
        "settings.read",
        "feature_flags.read",
        "audit.read",
        "food.analytics.read",
        "food.restaurant.read",
        "food.menu.read",
        "food.order.read",
        "food.zone.read",
        "food.quality.read",
      ]
    : capabilitySet;
  return {
    actorId: isAuditor ? "actor-auditor-local-1" : "actor-super-admin-local-1",
    memberships: [
      {
        membershipId: isAuditor ? "membership-auditor-local-1" : "membership-super-admin-local-1",
        organizationId: "organization-local-1",
        countryScopes: [{ organizationCountryId: "organization-country-local-1", countryCode: "MA" }],
        roles: [
          {
            roleId: isAuditor ? "role-auditor-local-1" : "role-super-admin-local-1",
            code: isAuditor ? "AUDITOR" : "SUPER_ADMIN",
            description: isAuditor ? "Read-only local test role" : "Full local test role",
          },
        ],
        permissionCodes: capabilities,
      },
    ],
    effectivePermissionCodes: capabilities,
    capabilities,
  };
}

function overridePayload(method, pathname, token, body) {
  const isAuditor = token.includes("auditor");
  // --- Operations UI stub: privileged-account MFA challenge flow (login 202 + /v1/auth/mfa/challenge/*) ---------------
  const loginEmail = typeof body?.email === "string" ? body.email : "";
  const tokens = {
    tokenType: "Bearer",
    accessToken: "super-admin-access-token",
    accessTokenExpiresIn: 3600,
    refreshToken: "super-admin-refresh-token",
    refreshTokenExpiresIn: 86400,
  };
  if (method === "POST" && pathname === "/v1/auth/login" && /mfa-(verify|enroll)/.test(loginEmail)) {
    return { __status: 202, mfaStatus: loginEmail.includes("mfa-enroll") ? "ENROLL" : "VERIFY", challengeToken: "stub-challenge-token", challengeExpiresIn: 300 };
  }
  if (method === "POST" && pathname === "/v1/auth/mfa/challenge/verify") {
    return body?.code === "123456" || body?.recoveryCode
      ? tokens
      : { __status: 401, statusCode: 401, code: "INVALID_MFA_CODE", message: "Invalid code", correlationId: "stub-mfa-invalid" };
  }
  if (method === "POST" && pathname === "/v1/auth/mfa/challenge/enroll/start") {
    return { secretBase32: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/NOKI:ops%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=NOKI", issuer: "NOKI" };
  }
  if (method === "POST" && pathname === "/v1/auth/mfa/challenge/enroll/confirm") {
    return body?.code === "123456"
      ? { recoveryCodes: ["ABCD-EFGH-JKMN", "PQRS-TUVW-XYZ2"], ...tokens }
      : { __status: 401, statusCode: 401, code: "INVALID_MFA_CODE", message: "Invalid code", correlationId: "stub-mfa-invalid" };
  }
  if (method === "POST" && pathname === "/v1/auth/login") {
    return {
      tokenType: "Bearer",
      accessToken: token.includes("auditor") ? "auditor-access-token" : "super-admin-access-token",
      accessTokenExpiresIn: 3600,
      refreshToken: token.includes("auditor") ? "auditor-refresh-token" : "super-admin-refresh-token",
      refreshTokenExpiresIn: 86400,
    };
  }
  if (method === "POST" && pathname === "/v1/auth/refresh") {
    return {
      tokenType: "Bearer",
      accessToken: isAuditor ? "auditor-access-token" : "super-admin-access-token",
      accessTokenExpiresIn: 3600,
      refreshToken: isAuditor ? "auditor-refresh-token" : "super-admin-refresh-token",
      refreshTokenExpiresIn: 86400,
    };
  }
  if (method === "POST" && pathname === "/v1/auth/logout") return { ok: true };
  if (method === "GET" && pathname === "/v1/auth/me") {
    return {
      actorId: isAuditor ? "actor-auditor-local-1" : "actor-super-admin-local-1",
      displayName: isAuditor ? "Noki Local Auditor" : "Noki Local Super Admin",
      email: isAuditor ? "auditor@local.noki.test" : "super.admin@local.noki.test",
      memberships: authPayload(isAuditor).memberships.map(({ membershipId, organizationId, countryScopes }) => ({
        membershipId,
        organizationId,
        countryScopes,
      })),
    };
  }
  if (method === "GET" && pathname === "/v1/auth/capabilities") return authPayload(isAuditor);
  // --- Operations UI stub: typed payloads where the generated spec only exposes a generic object DTO -----------------
  const inboundDetail = pathname.match(/^\/v1\/admin\/commerce\/inbound-shipments\/([^/]+)$/);
  if (method === "GET" && inboundDetail) {
    return { data: {
      id: inboundDetail[1], organizationId: "organization-local-1", sellerId: "seller-local-1", sellerName: "NOKI Local Seller",
      countryId: "country-local-1", countryCode: "MA", destinationWarehouseId: "warehouse-local-1", destinationWarehouseName: "Entrepôt Casablanca",
      reference: "INB-LOCAL-0001", supplierLabel: "Fournisseur local", status: "SHIPPED", expectedArrivalAt: now, receivedAt: null,
      lines: [
        { id: "line-local-1", productId: "product-local-1", productName: "Produit local A", variantId: "variant-local-1", sku: "SKU-A-001", expectedQuantity: 24, receivedQuantity: 0, damagedQuantity: 0, unitCost: "12.50", notes: null },
        { id: "line-local-2", productId: "product-local-2", productName: "Produit local B", variantId: "variant-local-2", sku: "SKU-B-002", expectedQuantity: 10, receivedQuantity: 4, damagedQuantity: 1, unitCost: null, notes: "Cartons abîmés" },
      ],
      receipts: [{ id: "receipt-local-1", status: "POSTED", postedAt: now, linesCount: 2 }],
      createdAt: now, updatedAt: now,
    } };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/sellers") {
    return {
      items: [
        {
          id: "seller-local-1",
          organizationId: "organization-local-1",
          code: "SLR-LOCAL-1",
          displayName: "NOKI Local Seller",
          legalName: "NOKI Local Seller SARL",
          onboardingStatus: "APPROVED",
          operationalStatus: "ACTIVE",
          countryIds: ["country-local-1"],
          countryCodes: ["MA"],
          productsCount: 3,
          offersCount: 2,
          ordersCount: 5,
          createdAt: now,
          updatedAt: now,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/inventory") {
    const row = (n, name, sku, onHand, available, reserved, defective) => ({
      id: `stock-local-${n}`, organizationId: "organization-local-1", countryId: "country-local-1", countryCode: "MA", sellerId: "seller-local-1",
      sellerName: "NOKI Local Seller", productId: `product-local-${n}`, productCode: `PRD-00${n}`, productName: name, variantId: `variant-local-${n}`,
      sku, variantName: "Standard", warehouseId: "warehouse-local-1", warehouseCode: "CASA-01", warehouseName: "Entrepôt Casablanca",
      onHandQuantity: onHand, availableQuantity: available, reservedQuantity: reserved, defectiveQuantity: defective, lastMovementAt: now, updatedAt: now,
    });
    return {
      items: [row(1, "Huile d'argan 250 ml", "ARG-250", 120, 96, 24, 0), row(2, "Savon noir 500 g", "SAV-500", 64, 60, 4, 2), row(3, "Couscous fin 1 kg", "COU-1KG", 18, 18, 0, 1)],
      page: 1, pageSize: 20, total: 3,
      summary: { onHand: 202, available: 174, reserved: 28, defective: 3, lowStock: 1 },
    };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/shipping") {
    const sh = (n, status, qc) => ({
      id: `shipment-local-${n}`, organizationId: "organization-local-1", countryId: "country-local-1", countryCode: "MA", orderId: `order-local-${n}`, orderNumber: `CMD-100${n}`,
      sellerId: "seller-local-1", sellerName: "NOKI Local Seller", warehouseId: "warehouse-local-1", warehouseName: "Entrepôt Casablanca", customerName: "Client Local", customerPhone: "+212 ******000",
      destination: "Casablanca", driverId: n === 1 ? null : "driver-local-1", driverName: n === 1 ? null : "Chauffeur Local", driverPhoneMasked: null, codAmount: "250.00", codCollected: null, codStatus: "PENDING",
      currencyCode: "MAD", fulfillmentStatus: "READY_FOR_DISPATCH", shipmentStatus: status, qcStatus: qc, lastLatitude: null, lastLongitude: null, lastPositionAt: null, assignedAt: null, outForDeliveryAt: null, deliveredAt: null, failedAt: null, updatedAt: now,
    });
    return { items: [sh(1, "READY_FOR_DISPATCH", "PASSED"), sh(2, "OUT_FOR_DELIVERY", "PASSED")], page: 1, pageSize: 20, total: 2 };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/inventory/movements") {
    const mv = (n, type, qty, ref) => ({
      id: `movement-local-${n}`, date: now, type, organizationId: "organization-local-1", countryId: "country-local-1", countryCode: "MA", sellerId: "seller-local-1",
      sellerName: "NOKI Local Seller", productId: `product-local-${n}`, productCode: `PRD-00${n}`, productName: ["Huile d'argan 250 ml", "Savon noir 500 g", "Couscous fin 1 kg"][n - 1],
      variantId: `variant-local-${n}`, sku: ["ARG-250", "SAV-500", "COU-1KG"][n - 1], warehouseId: "warehouse-local-1", warehouseName: "Entrepôt Casablanca",
      quantity: qty, reference: ref, orderId: null, reservationId: null, inboundShipmentId: null, inboundReceiptId: null, actorName: "Noki Local Super Admin",
    });
    return { items: [mv(1, "INBOUND_RECEIPT", 120, "INB-LOCAL-0001"), mv(2, "ADJUSTMENT_OUT", 2, "Casse"), mv(3, "RESERVATION_CREATED", 4, "CMD-1042")], page: 1, pageSize: 20, total: 3 };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/inbound-shipments") {
    const ib = (n, status, lines) => ({
      id: `shipment-local-${n}`, organizationId: "organization-local-1", sellerId: "seller-local-1", sellerName: "NOKI Local Seller", countryId: "country-local-1", countryCode: "MA",
      destinationWarehouseId: "warehouse-local-1", destinationWarehouseName: "Entrepôt Casablanca", reference: `INB-LOCAL-000${n}`, status, linesCount: lines, receiptsCount: n === 3 ? 1 : 0,
      expectedArrivalAt: now, receivedAt: n === 3 ? now : null, createdAt: now, updatedAt: now,
    });
    return { items: [ib(1, "SHIPPED", 2), ib(2, "IN_TRANSIT", 5), ib(3, "RECEIVED", 3)], page: 1, pageSize: 20, total: 3 };
  }
  if (
    method === "GET" &&
    [
      "/v1/admin/commerce/order-imports",
      "/v1/admin/commerce/inbound-shipments",
      "/v1/admin/commerce/inbound-receipts",
      "/v1/admin/commerce/inventory/movements",
      "/v1/admin/commerce/shipping",
      "/v1/admin/commerce/finance/invoices",
      "/v1/admin/commerce/finance/expenses",
      "/v1/admin/commerce/finance/bonuses",
      "/v1/admin/commerce/finance/payouts",
    ].includes(pathname)
  ) {
    return { items: [], page: 1, pageSize: 20, total: 0 };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/analytics") {
    return {
      data: {
        period: { start: "2026-07-01T00:00:00.000Z", end: now },
        summary: {
          orders: 42,
          confirmed: 31,
          confirmationRate: 74,
          delivered: 24,
          deliveryRate: 57,
          codExpected: "42000.00 MAD",
          codCollected: "38400.00 MAD",
          codVerified: "36000.00 MAD",
          sellerPayable: "32000.00 MAD",
          returnsIncidents: 3,
          stockOnHand: 120,
          stockAvailable: 96,
          stockReserved: 18,
          stockDefective: 6,
          activeFeeRules: 2,
        },
        economics: {},
        charts: {
          ordersTrend: [],
          confirmationStatusDistribution: [],
          deliveryStatusDistribution: [],
          codLifecycle: [],
          topProducts: [],
          topSellers: [],
          agentPerformance: [],
          driverPerformance: [],
          sellerProfitability: [],
        },
        generatedAt: now,
      },
    };
  }
  if (method === "GET" && pathname === "/v1/admin/commerce/settings") {
    return {
      data: {
        feeRules: [],
        zones: [],
        statusPresentation: {},
        counts: { feeRules: 0, zones: 0, activeZones: 0, feeRulesByType: [] },
        generatedAt: now,
      },
    };
  }
  if (method === "GET" && pathname === "/v1/analytics/admin-overview") {
    return {
      organizationId: "organization-local-1",
      countryId: "country-local-1",
      countryCode: "MA",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: now,
      kpis: { ordersCreated: 42, ordersConfirmed: 31, ordersDelivered: 24, ordersCancelled: 2 },
      backlog: { confirmationTasksCreated: 6, fulfillmentTasksOpen: 8, shipmentsOutForDelivery: 11, activeShipments: 19 },
      anomalies: { ordersDeliveryFailed: 2, failedShipments: 1, failedAttempts: 3, negativeBalanceCount: 0 },
      finance: {
        codCollectionsDeclared: 14,
        payoutBatchesMarkedPaid: 4,
        codExpectedAmount: [{ currencyId: "currency-local-1", currencyCode: "MAD", amount: "42000.00" }],
        codCollectedAmount: [{ currencyId: "currency-local-1", currencyCode: "MAD", amount: "38400.00" }],
        codRemittedAmount: [{ currencyId: "currency-local-1", currencyCode: "MAD", amount: "36000.00" }],
        payoutMarkedPaidAmount: [{ currencyId: "currency-local-1", currencyCode: "MAD", amount: "12000.00" }],
      },
      health: {
        operationsStatus: "OK",
        dataFreshness: "LIVE_QUERY",
        automationStatus: "NOT_CONFIGURED",
        aiStatus: "NOT_CONFIGURED",
      },
    };
  }
  // Phase 21: restaurant-partner invitation bridge. These two routes don't
  // exist in the pinned @agrismartchain/noki-shared-contracts version this
  // stub derives its generic routes from (see openApiPath above), so they
  // need an explicit override rather than the schema-driven materializer.
  const partnerAccessInviteMatch = /^\/v1\/admin\/food\/restaurants\/([^/]+)\/partner-access\/invite$/.exec(pathname);
  if (method === "POST" && partnerAccessInviteMatch) {
    const [, restaurantId] = partnerAccessInviteMatch;
    const email = typeof body?.email === "string" ? body.email : "owner@example.test";
    const roleCode = body?.roleCode === "FOOD_PARTNER_STAFF" ? "FOOD_PARTNER_STAFF" : "FOOD_PARTNER_ADMIN";
    const invitation = {
      id: `invitation-stub-${restaurantId}`,
      email,
      roleCode,
      status: "PENDING",
      expiresAt: "2026-08-07T12:00:00.000Z",
      createdAt: now,
    };
    partnerAccessByRestaurant[restaurantId] = {
      members: partnerAccessByRestaurant[restaurantId]?.members ?? [],
      pendingInvitations: [invitation],
    };
    return {
      mode: "INVITATION_SENT",
      invitation,
      inviteLink: `http://127.0.0.1:3000/fr/accept-invitation?token=stub-invite-token-${restaurantId}`,
    };
  }
  const partnerAccessMatch = /^\/v1\/admin\/food\/restaurants\/([^/]+)\/partner-access$/.exec(pathname);
  if (method === "GET" && partnerAccessMatch) {
    const [, restaurantId] = partnerAccessMatch;
    return partnerAccessByRestaurant[restaurantId] ?? { members: [], pendingInvitations: [] };
  }
  return null;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function valueContainsMarker(value, marker) {
  if (typeof value === "string") return value.includes(marker);
  if (Array.isArray(value)) return value.some((item) => valueContainsMarker(item, marker));
  if (value && typeof value === "object") return Object.values(value).some((item) => valueContainsMarker(item, marker));
  return false;
}

function mutationErrorForBody(body) {
  const marker = [
    ["E2E_422", 422, "E2E_VALIDATION"],
    ["E2E_403", 403, "E2E_FORBIDDEN"],
    ["E2E_409", 409, "E2E_CONFLICT"],
  ].find(([candidate]) => valueContainsMarker(body, candidate));

  if (!marker) return null;
  const [, statusCode, code] = marker;
  return {
    statusCode,
    payload: {
      statusCode,
      code,
      message: `${code} injected by Playwright stub.`,
      details: [{ field: "name", messages: ["E2E validation error"] }],
      correlationId: "stub-correlation-id",
    },
  };
}

function withListItems(payload, mapper) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) return payload;
  return {
    ...payload,
    items: payload.items.map((item, index) => (item && typeof item === "object" ? mapper(item, index) : item)),
  };
}

function normalizePayload(method, pathname, payload) {
  if (method !== "GET") return payload;
  const listDefaults = (item, index) => ({
    ...item,
    id: item.id || `stub-${index + 1}`,
    organizationId: item.organizationId || "organization-local-1",
    organizationName: item.organizationName || "NOKI Local",
    countryId: item.countryId || "country-local-1",
    countryCode: item.countryCode || "MA",
    updatedAt: item.updatedAt || now,
  });

  if (pathname === "/v1/admin/catalog/products" || pathname === "/v1/admin/catalog/offers") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "INACTIVE" }));
  }
  if (pathname === "/v1/admin/approvals") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "PENDING" }));
  }
  if (pathname === "/v1/admin/sessions") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "ACTIVE" }));
  }
  if (pathname === "/v1/admin/ai/reviews") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "PENDING" }));
  }
  if (pathname === "/v1/admin/settings/feature-flags") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "DISABLED", rolloutPercent: 25 }));
  }
  if (pathname === "/v1/admin/integrations/connections" || pathname === "/v1/admin/integrations/webhooks") {
    return withListItems(payload, (item, index) => ({ ...listDefaults(item, index), status: "ACTIVE" }));
  }
  if (pathname === "/v1/admin/food/onboarding") {
    const base = withListItems(payload, listDefaults);
    const [first] = base.items;
    if (!first) return base;
    return {
      ...base,
      items: [
        { ...first, status: "SUBMITTED" },
        { ...first, id: "onboarding-approved-1", restaurantPartnerId: "restaurant-approved-1", status: "APPROVED" },
      ],
      total: 2,
    };
  }
  if (/^\/v1\/admin\/food\/orders\/[^/]+$/.test(pathname)) {
    return {
      ...payload,
      status: "PLACED",
      shipment: payload.shipment ? { ...payload.shipment, status: "READY_FOR_DISPATCH" } : payload.shipment,
    };
  }
  return withListItems(payload, listDefaults);
}

function send(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type,accept-language,x-correlation-id,idempotency-key",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const method = request.method?.toUpperCase() ?? "GET";
  if (method === "OPTIONS") return send(response, 204, {});
  if (method === "GET" && url.pathname === "/health") return send(response, 200, { ok: true });
  if (method === "GET" && url.pathname === "/__requests") return send(response, 200, { requests: requestLog });
  if (method === "POST" && url.pathname === "/__requests/reset") {
    requestLog.length = 0;
    partnerAccessByRestaurant = {};
    return send(response, 200, { ok: true });
  }

  const body = method === "GET" ? "" : await readBody(request);
  let parsedBody = null;
  try {
    parsedBody = body ? JSON.parse(body) : null;
  } catch {
    parsedBody = null;
  }

  const auth = request.headers.authorization ?? "";
  const loginEmail = typeof parsedBody?.email === "string" ? parsedBody.email : "";
  const tokenHint = loginEmail.includes("auditor") || auth.includes("auditor") ? "auditor" : "super-admin";
  const override = overridePayload(method, url.pathname, tokenHint, parsedBody);
  if (override) {
    const { __status, ...overrideBody } = override;
    const status = __status ?? (method === "POST" && !url.pathname.includes("auth") ? 201 : 200);
    if (method !== "GET" && !url.pathname.includes("auth")) {
      requestLog.push({ method, pathname: url.pathname, status, body: parsedBody, at: now });
    }
    return send(response, status, overrideBody);
  }

  if (tokenHint === "auditor" && method !== "GET") {
    const payload = {
      statusCode: 403,
      code: "E2E_AUDITOR_FORBIDDEN",
      message: "AUDITOR token cannot mutate admin resources in the Playwright stub.",
      correlationId: "stub-auditor-forbidden",
    };
    requestLog.push({ method, pathname: url.pathname, status: 403, body: parsedBody, at: now });
    return send(response, 403, payload);
  }

  const injectedError = method === "GET" ? null : mutationErrorForBody(parsedBody);
  if (injectedError) {
    requestLog.push({ method, pathname: url.pathname, status: injectedError.statusCode, body: parsedBody, at: now });
    return send(response, injectedError.statusCode, injectedError.payload);
  }

  const route = routes.find((candidate) => candidate.method === method && candidate.regex.test(url.pathname));
  if (!route) {
    return send(response, 404, {
      statusCode: 404,
      code: "STUB_ROUTE_NOT_FOUND",
      message: `No stub route for ${method} ${url.pathname}`,
      correlationId: "stub-correlation-id",
    });
  }

  const payload = normalizePayload(method, url.pathname, route.schema ? materialize(route.schema) : { ok: true });
  const status = method === "POST" ? 201 : 200;
  if (method !== "GET") requestLog.push({ method, pathname: url.pathname, status, body: parsedBody, at: now });
  send(response, status, payload ?? { ok: true });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`NOKI admin Playwright stub API listening on http://127.0.0.1:${port}\n`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
