import type { Locale } from "./locales";

const INTL_LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  // Explicit Latin numbering system: modern professional Arabic dashboards use
  // Western digits, and this avoids depending on the runtime ICU data's default.
  ar: "ar-u-nu-latn",
};

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE_TAGS[locale], options).format(value);
}

export function formatCurrency(
  locale: Locale,
  value: number,
  currency: string,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
): string {
  return new Intl.NumberFormat(INTL_LOCALE_TAGS[locale], { ...options, style: "currency", currency }).format(value);
}

export function formatPercent(
  locale: Locale,
  value: number,
  options?: Omit<Intl.NumberFormatOptions, "style">,
): string {
  return new Intl.NumberFormat(INTL_LOCALE_TAGS[locale], { ...options, style: "percent" }).format(value);
}

export function formatDate(locale: Locale, date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAGS[locale], options).format(date);
}

export function formatTime(locale: Locale, date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAGS[locale], { timeStyle: "short", ...options }).format(date);
}
