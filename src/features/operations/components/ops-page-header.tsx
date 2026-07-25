"use client";

import { Breadcrumbs, PageHeader } from "@agrismartchain/noki-design-system";

export interface OpsPageHeaderProps {
  breadcrumbsLabel: string;
  brandLabel: string;
  brandHref: string;
  sectionLabel: string;
  eyebrow: string;
  title: string;
  description: string;
}

/** Design-system Breadcrumbs/PageHeader must render from within a "use client" boundary. */
export function OpsPageHeader({ breadcrumbsLabel, brandLabel, brandHref, sectionLabel, eyebrow, title, description }: OpsPageHeaderProps) {
  return (
    <>
      <Breadcrumbs label={breadcrumbsLabel} items={[{ label: brandLabel, href: brandHref }, { label: sectionLabel, current: true }]} />
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
    </>
  );
}
