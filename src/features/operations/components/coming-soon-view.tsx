"use client";

import { EmptyState, PageHeader, Stack } from "@agrismartchain/noki-design-system";
import { Construction } from "lucide-react";

export interface ComingSoonViewProps {
  eyebrow: string;
  title: string;
  description: string;
  comingSoonTitle: string;
  comingSoonDescription: string;
}

export function ComingSoonView({ eyebrow, title, description, comingSoonTitle, comingSoonDescription }: ComingSoonViewProps) {
  return (
    <Stack gap="lg">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState icon={<Construction size={32} />} title={comingSoonTitle} description={comingSoonDescription} />
    </Stack>
  );
}
