/**
 * CommerceCodController (noki-api `admin/commerce/*`) and
 * AdminOperationsController (`admin/operations/*`, `admin/delivery/*`)
 * respond with generic envelopes -- `{ data: object }` or
 * `{ items: object[], total, page, pageSize }` -- for every endpoint this
 * app calls; the OpenAPI contract does not declare named per-resource
 * response DTOs for them. These interfaces describe the actual runtime
 * shape returned by noki-api's commerce-cod.service.ts / admin-operations
 * DTOs; they are asserted at the server/client.ts boundary rather than
 * derived from `components["schemas"]`.
 */

export const INBOUND_STATUSES = ["DRAFT", "READY", "SHIPPED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] as const;
export type InboundStatus = (typeof INBOUND_STATUSES)[number];

export const STOCK_STATES = ["AVAILABLE", "RESERVED", "DEFECTIVE", "LOW_STOCK", "OUT_OF_STOCK"] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "INBOUND_RECEIPT",
  "RESERVATION_CREATED",
  "RESERVATION_RELEASED",
  "PICK",
  "RELEASE",
  "TRANSFER",
  "RETURN",
  "DAMAGE",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const FULFILLMENT_TASK_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "PICKING",
  "PACKED",
  "QC_PENDING",
  "QC_FAILED",
  "QC_PASSED",
  "READY_FOR_DISPATCH",
  "CANCELLED",
] as const;
export type FulfillmentTaskStatus = (typeof FULFILLMENT_TASK_STATUSES)[number];

export const INCIDENT_STATUSES = ["OPEN", "RESOLVED"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface InboundLine {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  unitCost: string | null;
  notes: string | null;
}

export interface InboundReceiptSummary {
  id: string;
  status: string;
  postedAt: string;
  linesCount: number;
}

export interface InboundListItem {
  id: string;
  organizationId: string;
  sellerId: string;
  sellerName: string;
  countryId: string;
  countryCode: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  reference: string;
  status: InboundStatus;
  linesCount: number;
  receiptsCount: number;
  expectedArrivalAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboundDetail {
  id: string;
  organizationId: string;
  sellerId: string;
  sellerName: string;
  countryId: string;
  countryCode: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  reference: string;
  supplierLabel: string | null;
  status: InboundStatus;
  expectedArrivalAt: string | null;
  receivedAt: string | null;
  lines: InboundLine[];
  receipts: InboundReceiptSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRecord {
  id: string;
  organizationId: string;
  countryId: string;
  countryCode: string;
  sellerId: string | null;
  sellerName: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  variantName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  defectiveQuantity: number;
  lastMovementAt: string | null;
  updatedAt: string;
}

export interface InventorySummary {
  onHand: number;
  available: number;
  reserved: number;
  defective: number;
  lowStock: number;
}

export interface StockMovementRecord {
  id: string;
  date: string;
  type: StockMovementType;
  organizationId: string;
  countryId: string;
  countryCode: string;
  sellerId: string | null;
  sellerName: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reference: string | null;
  orderId: string | null;
  reservationId: string | null;
  inboundShipmentId: string | null;
  inboundReceiptId: string | null;
  actorName: string | null;
}

export interface InboundReceiptLine {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  receivedQuantity: number;
  damagedQuantity: number;
  discrepancyQuantity: number;
  notes: string | null;
}

export interface InboundReceiptRecord {
  id: string;
  organizationId: string;
  countryId: string;
  countryCode: string;
  shipmentId: string;
  shipmentReference: string;
  sellerId: string;
  sellerName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  status: string;
  postedByActorName: string | null;
  postedAt: string;
  linesCount: number;
  receivedQuantity: number;
  damagedQuantity: number;
  discrepancyQuantity: number;
  lines: InboundReceiptLine[];
  createdAt: string;
  updatedAt: string;
}

export interface OperationsOverview {
  organizationCount: number;
  countryCount: number;
  warehouses: { total: number; active: number; inactive: number };
  inventory: {
    stockBalances: number;
    onHandQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    activeReservations: number;
  };
  fulfillment: { open: number; assigned: number; picking: number; packed: number };
  delivery: {
    readyForDispatch: number;
    assigned: number;
    outForDelivery: number;
    delivered: number;
    failed: number;
    activeShipments: number;
  };
  proofing: {
    activeQrTokens: number;
    pendingOtpChallenges: number;
    evidenceCaptured: number;
    openIncidents: number;
  };
  generatedAt: string;
}

export interface FulfillmentTaskRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  countryId: string;
  countryCode: string;
  warehouseId: string;
  warehouseName: string;
  orderId: string;
  orderNumber: string;
  inventoryReservationId: string;
  assignedActorId: string | null;
  assignedActorDisplayName: string | null;
  status: FulfillmentTaskStatus;
  linesCount: number;
  shipmentsCount: number;
  pickingStartedAt: string | null;
  packedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryIncidentRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  countryId: string;
  countryCode: string;
  shipmentId: string;
  orderNumber: string;
  type: string;
  status: IncidentStatus;
  comment: string | null;
  actorId: string;
  actorDisplayName: string;
  resolvedByActorId: string | null;
  resolvedByActorDisplayName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  summary?: InventorySummary;
}
