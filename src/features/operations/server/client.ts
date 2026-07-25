import { createServerNokiClient, NokiApiError, toNokiApiError } from "@/lib/api";
import type { FetchLike } from "@/lib/api";

import type {
  DeliveryIncidentRecord,
  FulfillmentTaskRecord,
  FulfillmentTaskStatus,
  InboundDetail,
  InboundListItem,
  InboundReceiptRecord,
  IncidentStatus,
  InventoryRecord,
  OperationsOverview,
  PageResult,
  StockMovementRecord,
  StockMovementType,
  StockState,
} from "../types";

export interface OpsContext {
  accessToken: string;
  locale?: string;
  correlationId?: string;
  fetch?: FetchLike;
}

export interface OpsPageQuery {
  organizationId?: string;
  countryId?: string;
  sellerId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type OpsInventoryQuery = OpsPageQuery & {
  warehouseId?: string;
  productId?: string;
  stockState?: StockState;
};

export type OpsMovementsQuery = OpsInventoryQuery & {
  variantId?: string;
  type?: StockMovementType;
};

export type OpsReceiptsQuery = OpsPageQuery & {
  warehouseId?: string;
  shipmentId?: string;
};

export type OpsFulfillmentQuery = {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  countryId?: string;
  warehouseId?: string;
  search?: string;
  status?: FulfillmentTaskStatus;
};

export type OpsIncidentsQuery = {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  countryId?: string;
  warehouseId?: string;
  search?: string;
  status?: IncidentStatus;
};

interface OpenApiFetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** CommerceCodController wraps every single-object response as `{ data: T }`. */
function unwrapCommerceData<T>(result: OpenApiFetchResult<{ data: unknown } | undefined>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  return result.data.data as T;
}

/** AdminOperationsController returns single-object responses directly, unwrapped. */
function unwrapDirect<T>(result: OpenApiFetchResult<T>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  return result.data;
}

/** Both controllers return list responses as a flat `{ items, total, page, pageSize }`. */
function unwrapList<T>(
  result: OpenApiFetchResult<({ items: unknown[]; total: number; page: number; pageSize: number } & Record<string, unknown>) | undefined>,
): PageResult<T> {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  const { items, total, page, pageSize, ...extra } = result.data;
  return { ...extra, items: items as T[], total, page, pageSize };
}

function serverClient(context: OpsContext) {
  return createServerNokiClient({
    accessToken: context.accessToken,
    locale: context.locale,
    correlationId: context.correlationId,
    fetch: context.fetch,
  }).client;
}

// ---- Dashboard: admin/operations overview, fulfillment queue, incidents ----

export async function getOperationsOverview(context: OpsContext): Promise<OperationsOverview> {
  return unwrapDirect(await serverClient(context).GET("/v1/admin/operations/overview", {}));
}

export async function listFulfillmentTasks(query: OpsFulfillmentQuery, context: OpsContext): Promise<PageResult<FulfillmentTaskRecord>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/operations/fulfillment", { params: { query } }));
}

export async function listDeliveryIncidents(query: OpsIncidentsQuery, context: OpsContext): Promise<PageResult<DeliveryIncidentRecord>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/delivery/incidents", { params: { query } }));
}

// ---- Inbound shipments ----

/** GET /v1/admin/commerce/inbound-shipments takes CommerceCodPageQueryDto -- no `status` filter exists on this endpoint; filter the returned items client-side if a status breakdown is needed. */
export async function listInbound(query: OpsPageQuery, context: OpsContext): Promise<PageResult<InboundListItem>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/commerce/inbound-shipments", { params: { query } }));
}

export async function getInbound(id: string, context: OpsContext): Promise<InboundDetail> {
  return unwrapCommerceData(await serverClient(context).GET("/v1/admin/commerce/inbound-shipments/{id}", { params: { path: { id } } }));
}

export async function submitInbound(id: string, context: OpsContext): Promise<InboundDetail> {
  return unwrapCommerceData(await serverClient(context).POST("/v1/admin/commerce/inbound-shipments/{id}/submit", { params: { path: { id } } }));
}

export async function shipInbound(id: string, context: OpsContext): Promise<InboundDetail> {
  return unwrapCommerceData(await serverClient(context).POST("/v1/admin/commerce/inbound-shipments/{id}/ship", { params: { path: { id } } }));
}

export async function cancelInbound(id: string, context: OpsContext): Promise<InboundDetail> {
  return unwrapCommerceData(await serverClient(context).POST("/v1/admin/commerce/inbound-shipments/{id}/cancel", { params: { path: { id } } }));
}

export interface ReceiveInboundInput {
  idempotencyKey: string;
  notes?: string;
  lines: Array<{ shipmentLineId: string; receivedQuantity: number; damagedQuantity?: number; notes?: string }>;
}

export async function receiveInbound(id: string, body: ReceiveInboundInput, context: OpsContext): Promise<InboundDetail> {
  return unwrapCommerceData(
    await serverClient(context).POST("/v1/admin/commerce/inbound-shipments/{id}/receive", {
      params: { path: { id } },
      body: { ...body, lines: body.lines.map((line) => ({ ...line, damagedQuantity: line.damagedQuantity ?? 0 })) },
    }),
  );
}

// ---- Inbound receipts (Receiving) ----

export async function listInboundReceipts(query: OpsReceiptsQuery, context: OpsContext): Promise<PageResult<InboundReceiptRecord>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/commerce/inbound-receipts", { params: { query } }));
}

export async function getInboundReceipt(id: string, context: OpsContext): Promise<InboundReceiptRecord> {
  return unwrapCommerceData(await serverClient(context).GET("/v1/admin/commerce/inbound-receipts/{id}", { params: { path: { id } } }));
}

// ---- Inventory & stock movements ----

export async function listInventory(query: OpsInventoryQuery, context: OpsContext): Promise<PageResult<InventoryRecord>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/commerce/inventory", { params: { query } }));
}

export async function listStockMovements(query: OpsMovementsQuery, context: OpsContext): Promise<PageResult<StockMovementRecord>> {
  return unwrapList(await serverClient(context).GET("/v1/admin/commerce/inventory/movements", { params: { query } }));
}
