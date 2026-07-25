import { describe, expect, it } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

import type { Locale } from "./locales";
import { LOCALES } from "./locales";

type MessageTree = { [key: string]: string | MessageTree };

const catalogs: Record<Locale, MessageTree> = { fr, en, ar };

function collectKeyPaths(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      return [path];
    }
    if (value && typeof value === "object") {
      return collectKeyPaths(value, path);
    }
    throw new Error(`Unexpected non-string, non-object value at "${path}" in a message catalog.`);
  });
}

function collectEmptyKeyPaths(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      return value.trim().length === 0 ? [path] : [];
    }
    if (value && typeof value === "object") {
      return collectEmptyKeyPaths(value, path);
    }
    return [];
  });
}

describe("i18n message catalog parity", () => {
  it("declares a catalog for every supported locale", () => {
    for (const locale of LOCALES) {
      expect(catalogs, `Missing message catalog for locale "${locale}"`).toHaveProperty(locale);
    }
  });

  it("has strictly identical key sets across fr, en and ar", () => {
    const referenceLocale = "fr";
    const referenceKeys = collectKeyPaths(catalogs[referenceLocale]).sort();

    for (const locale of LOCALES.filter((candidate) => candidate !== referenceLocale)) {
      const keys = collectKeyPaths(catalogs[locale]).sort();
      const missing = referenceKeys.filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !referenceKeys.includes(key));

      expect(missing, `Locale "${locale}" is missing keys present in "${referenceLocale}"`).toEqual([]);
      expect(extra, `Locale "${locale}" has extra keys not present in "${referenceLocale}"`).toEqual([]);
    }
  });

  it("has no empty message values in any locale", () => {
    for (const [locale, tree] of Object.entries(catalogs)) {
      const emptyKeys = collectEmptyKeyPaths(tree);
      expect(emptyKeys, `Locale "${locale}" has empty message values`).toEqual([]);
    }
  });
});
