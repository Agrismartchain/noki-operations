import nokiLogo from "@/assets/brand/noki-logo-sidebar.png";

import styles from "./noki-logo.module.css";

export type NokiLogoSize = "sm" | "md" | "lg" | "xl";

interface NokiLogoProps {
  size?: NokiLogoSize;
  /**
   * Accessible name. Omit (decorative) when the brand name is already rendered as text next to the logo, e.g. in the
   * sidebar; pass it when the logo is the only identity on screen, e.g. the login page.
   */
  alt?: string;
  className?: string;
  testId?: string;
}

/**
 * The NOKI yellow logo (reusable across every NOKI dashboard). The source artwork is a solid-yellow RGB image without an
 * alpha channel, so it is always shown as a rounded tile and never on a simulated transparent background.
 */
export function NokiLogo({ size = "md", alt, className, testId }: NokiLogoProps) {
  const decorative = alt === undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`${styles.logo} ${styles[size]} ${className ?? ""}`.trim()}
      src={nokiLogo.src}
      width={nokiLogo.width}
      height={nokiLogo.height}
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? "true" : undefined}
      data-testid={testId}
    />
  );
}
