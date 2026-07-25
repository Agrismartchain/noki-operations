import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BrowserExtensionHydrationCleanupScript } from "@/components/theme/browser-extension-hydration-cleanup-script";
import { NokiThemeProvider } from "@/components/theme/noki-theme-provider";
import { ThemeInitializationScript } from "@/components/theme/theme-initialization-script";
import { getLocaleDirection, isLocale } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

import "@agrismartchain/noki-design-system/styles.css";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const direction = getLocaleDirection(locale);

  return (
    // The initialization script sets data-noki-theme before React hydrates, so
    // only the html element has an intentional server/client attribute delta.
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <BrowserExtensionHydrationCleanupScript />
        <ThemeInitializationScript />
        <NextIntlClientProvider>
          <NokiThemeProvider>{children}</NokiThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
