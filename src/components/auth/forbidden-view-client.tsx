"use client";

import { Alert, PageHeader, Stack } from "@agrismartchain/noki-design-system";

export interface ForbiddenViewClientProps {
  title: string;
  description: string;
}

export function ForbiddenViewClient({ title, description }: ForbiddenViewClientProps) {
  return (
    <Stack gap="lg">
      <PageHeader title={title} description={description} />
      <Alert tone="warning" title={title}>
        {description}
      </Alert>
    </Stack>
  );
}
