import type { NokiTheme } from "@agrismartchain/noki-design-system";

export const NOKI_THEME_STORAGE_KEY = "noki-operations-theme";

export const NOKI_THEMES: readonly NokiTheme[] = ["dashboard-light", "dashboard-dark"];

export const DEFAULT_NOKI_THEME: NokiTheme = "dashboard-light";

export function isNokiTheme(value: unknown): value is NokiTheme {
  return typeof value === "string" && (NOKI_THEMES as readonly string[]).includes(value);
}
