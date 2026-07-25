export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type OpsSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedOpsListFilters {
  search?: string;
  organizationId?: string;
  /** Optional single-value status filter, shared by the fulfillment/delivery status-tab pages (picking, qc, shipping, incidents). Absent means "all statuses". */
  status?: string;
  page: number;
  pageSize: number;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number, max?: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return max !== undefined ? Math.min(parsed, max) : parsed;
}

export function parseOpsListSearchParams(searchParams: OpsSearchParams): ParsedOpsListFilters {
  const search = firstValue(searchParams.search)?.trim();
  const organizationId = firstValue(searchParams.organizationId)?.trim();
  const status = firstValue(searchParams.status)?.trim();

  return {
    search: search && search.length > 0 ? search : undefined,
    organizationId: organizationId && organizationId.length > 0 ? organizationId : undefined,
    status: status && status.length > 0 ? status : undefined,
    page: parsePositiveInt(firstValue(searchParams.page), 1),
    pageSize: parsePositiveInt(firstValue(searchParams.pageSize), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

export function buildOpsListSearchParams(current: ParsedOpsListFilters, overrides: Partial<ParsedOpsListFilters>): string {
  const next: ParsedOpsListFilters = { ...current, ...overrides, page: overrides.page ?? 1 };

  const params = new URLSearchParams();
  if (next.search) params.set("search", next.search);
  if (next.organizationId) params.set("organizationId", next.organizationId);
  if (next.status) params.set("status", next.status);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(next.pageSize));

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}
