export const LOCALES = ["fr", "en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export type Direction = "ltr" | "rtl";

export const LOCALE_DIRECTIONS: Record<Locale, Direction> = {
  fr: "ltr",
  en: "ltr",
  ar: "rtl",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getLocaleDirection(locale: Locale): Direction {
  return LOCALE_DIRECTIONS[locale];
}
