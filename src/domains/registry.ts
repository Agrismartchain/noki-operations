import type { DomainDescriptor } from "./types";

/**
 * The exact ten navigation items required for the OPERATIONS role, each
 * gated by one of the real permission codes granted to
 * SYSTEM_ROLE_CODES.OPERATIONS in noki-api's authorization catalog
 * (src/modules/authorization/authorization.constants.ts). No Finance,
 * global Users, or Governance items exist here -- this role structurally
 * cannot reach them.
 *
 * Dashboard, Inbound, Receiving and Inventory are fully implemented against
 * real backend endpoints. Picking, Packing, QC, Shipping Orders and
 * Incidents are real, capability-gated routes that currently render a
 * "coming soon" notice -- their mutation endpoints exist in noki-api
 * (fulfillment.controller.ts, commerce-cod.controller.ts,
 * admin-operations.controller.ts) but the queue/detail UI for them is out of
 * scope for this pass and will be built in a follow-up.
 */
export const DOMAIN_REGISTRY: DomainDescriptor[] = [
  { id: "dashboard", labelKey: "navigation.dashboard", href: "/", capability: "operations.read" },
  { id: "inbound", labelKey: "navigation.inbound", href: "/inbound", capability: "commerce.inbound.read" },
  { id: "receiving", labelKey: "navigation.receiving", href: "/receiving", capability: "commerce.inbound.read" },
  { id: "inventory", labelKey: "navigation.inventory", href: "/inventory", capability: "inventory.stock.read" },
  { id: "movements", labelKey: "navigation.movements", href: "/movements", capability: "inventory.stock.read" },
  { id: "picking", labelKey: "navigation.picking", href: "/picking", capability: "fulfillment.task.pick" },
  { id: "packing", labelKey: "navigation.packing", href: "/packing", capability: "fulfillment.task.pack" },
  { id: "qc", labelKey: "navigation.qc", href: "/qc", capability: "commerce.qc.manage" },
  { id: "shipping", labelKey: "navigation.shipping", href: "/shipping", capability: "delivery.admin.read" },
  { id: "incidents", labelKey: "navigation.incidents", href: "/incidents", capability: "incidents.read" },
];
