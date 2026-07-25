/**
 * Single source of truth for a top-level noki-operations navigation domain.
 * Unlike noki-admin's DOMAIN_REGISTRY, warehouse operations navigation is a
 * flat list (no nested sections): every domain here renders as exactly one
 * sidebar link, gated by exactly one OPERATIONS-role permission code.
 */
export interface DomainDescriptor {
  id: string;
  labelKey: string;
  href: string;
  /** A SYSTEM_PERMISSION_CODES value from noki-api's authorization catalog. */
  capability?: string;
}
