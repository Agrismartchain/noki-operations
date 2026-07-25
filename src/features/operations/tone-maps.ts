import type { BadgeTone } from "@agrismartchain/noki-design-system";

import type { DeliveryShipmentStatus, FulfillmentTaskStatus, IncidentStatus, InboundStatus } from "./types";

export const INBOUND_TONE: Record<InboundStatus, BadgeTone> = {
  DRAFT: "neutral",
  READY: "info",
  SHIPPED: "info",
  IN_TRANSIT: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export const FULFILLMENT_TONE: Record<FulfillmentTaskStatus, BadgeTone> = {
  OPEN: "neutral",
  ASSIGNED: "info",
  PICKING: "info",
  PACKED: "warning",
  QC_PENDING: "warning",
  QC_FAILED: "danger",
  QC_PASSED: "success",
  READY_FOR_DISPATCH: "success",
  CANCELLED: "danger",
};

export const INCIDENT_TONE: Record<IncidentStatus, BadgeTone> = {
  OPEN: "danger",
  RESOLVED: "success",
};

export const DELIVERY_SHIPMENT_TONE: Record<DeliveryShipmentStatus, BadgeTone> = {
  READY_FOR_DISPATCH: "warning",
  ASSIGNED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  FAILED: "danger",
  CANCELLED: "danger",
};
