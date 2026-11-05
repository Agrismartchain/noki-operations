import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const catalogs = { fr, en, ar } as const;

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string, values?: { year: number }) => {
    const locale = (globalThis as { __footerLocale?: keyof typeof catalogs }).__footerLocale ?? "fr";
    const template = (catalogs[locale].shell.footer as Record<string, string>)[key];
    return (template ?? "").replace("{year}", String(values?.year));
  }),
}));

const { AppFooter } = await import("./app-footer");

async function renderFooter(locale: "fr" | "en" | "ar", year?: number) {
  (globalThis as { __footerLocale?: string }).__footerLocale = locale;
  render(await AppFooter({ year }));
}

describe("AppFooter", () => {
  it("shows © <current year> NOKI — rights reserved in every locale", async () => {
    const year = new Date().getFullYear();
    await renderFooter("fr");
    expect(screen.getByTestId("app-footer").textContent).toBe(`© ${year} NOKI — Tous droits réservés`);
  });

  it.each([
    ["en", "© 2031 NOKI — All rights reserved"],
    ["ar", "© 2031 NOKI — جميع الحقوق محفوظة"],
  ] as const)("renders the %s copy with an explicit year", async (locale, expected) => {
    await renderFooter(locale, 2031);
    expect(screen.getByTestId("app-footer").textContent).toBe(expected);
  });

  it("is a contentinfo landmark", async () => {
    await renderFooter("fr");
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});
