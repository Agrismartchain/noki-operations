"use client";

import { Pagination } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildOpsListSearchParams, type ParsedOpsListFilters } from "../server/list-query";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface OpsPaginationProps {
  filters: ParsedOpsListFilters;
  page: number;
  pageSize: number;
  total: number;
}

export function OpsPagination({ filters, page, pageSize, total }: OpsPaginationProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  function navigate(overrides: Partial<ParsedOpsListFilters>) {
    router.push(`${pathname}${buildOpsListSearchParams(filters, overrides)}`);
  }

  if (total === 0) {
    return null;
  }

  return (
    <Pagination
      aria-label={t("common.pagination.ariaLabel")}
      page={page}
      onPageChange={(nextPage) => navigate({ page: nextPage })}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      onPageSizeChange={(nextPageSize) => navigate({ pageSize: nextPageSize, page: 1 })}
      previousLabel={t("common.pagination.previous")}
      nextLabel={t("common.pagination.next")}
      pageSizeLabel={t("common.pagination.rowsPerPage")}
    />
  );
}
