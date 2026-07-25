"use client";

import { Tabs, TabsList, TabsTrigger } from "@agrismartchain/noki-design-system";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildOpsListSearchParams, type ParsedOpsListFilters } from "../server/list-query";

export interface OpsStatusTabOption {
  value: string | undefined;
  label: string;
}

export interface OpsStatusTabsProps {
  filters: ParsedOpsListFilters;
  options: OpsStatusTabOption[];
  "aria-label": string;
}

/**
 * URL-driven status filter, shared by picking/qc/shipping/incidents. Every
 * option maps to a real single-value `status` query param sent straight to
 * the backend (list endpoints only support one status at a time) --
 * `value: undefined` means "no status filter" (every status the actor can
 * see). Navigating resets to page 1, matching OpsPagination's page-size
 * change behaviour.
 */
export function OpsStatusTabs({ filters, options, ...props }: OpsStatusTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const active = options.find((option) => option.value === filters.status) ?? options[0];

  function navigate(value: string | undefined) {
    router.push(`${pathname}${buildOpsListSearchParams(filters, { status: value, page: 1 })}`);
  }

  return (
    <Tabs value={active?.value ?? "__all__"} onValueChange={(next) => navigate(next === "__all__" ? undefined : next)}>
      <TabsList aria-label={props["aria-label"]}>
        {options.map((option) => (
          <TabsTrigger key={option.value ?? "__all__"} value={option.value ?? "__all__"}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
