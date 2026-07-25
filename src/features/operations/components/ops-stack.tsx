"use client";

import { Stack } from "@agrismartchain/noki-design-system";

/**
 * `@agrismartchain/noki-design-system`'s barrel pulls in a `client-only`
 * guard transitively, so it must never be imported directly from a Server
 * Component page.tsx (Next.js aborts route-config collection with
 * "'client-only' cannot be imported from a Server Component module").
 * page.tsx files import this thin "use client" wrapper instead, exactly
 * like OpsPageHeader/OpsPagination/*Table already do.
 */
export function OpsStack({ children }: { children: React.ReactNode }) {
  return <Stack gap="lg">{children}</Stack>;
}
