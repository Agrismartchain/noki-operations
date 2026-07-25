import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

/** Domain-id -> icon. Keyed by `DomainDescriptor.id` (see registry.ts). */
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  inbound: PackageSearch,
  receiving: PackageCheck,
  inventory: Boxes,
  movements: Repeat,
  picking: ClipboardList,
  packing: PackagePlus,
  qc: ShieldCheck,
  shipping: Truck,
  incidents: ShieldAlert,
};
