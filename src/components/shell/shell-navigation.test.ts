import { describe, expect, it } from "vitest";

import { DOMAIN_REGISTRY } from "@/domains/registry";

import { getShellNavigation, localizeShellHref, SHELL_NAVIGATION } from "./shell-navigation";

describe("shell-navigation", () => {
  it("derives exactly the ten OPERATIONS navigation items from the domain registry", () => {
    expect(SHELL_NAVIGATION.map((item) => item.key)).toEqual([
      "dashboard",
      "inbound",
      "receiving",
      "inventory",
      "movements",
      "picking",
      "packing",
      "qc",
      "shipping",
      "incidents",
    ]);
  });

  it("carries the real OPERATIONS-role permission code for every item", () => {
    expect(SHELL_NAVIGATION.every((item) => typeof item.capability === "string" && item.capability.length > 0)).toBe(true);
  });

  it("never contains a Finance, Users, or Governance item", () => {
    const keys = DOMAIN_REGISTRY.map((domain) => domain.id);
    expect(keys).not.toContain("finance");
    expect(keys).not.toContain("users");
    expect(keys).not.toContain("governance");
  });

  it("localizes the root href without a duplicated slash", () => {
    expect(localizeShellHref("fr", "/")).toBe("/fr");
    expect(localizeShellHref("fr", "/inbound")).toBe("/fr/inbound");
  });

  it("localizes every item href for the requested locale", () => {
    const navigation = getShellNavigation("en");
    expect(navigation.find((item) => item.key === "inventory")?.href).toBe("/en/inventory");
  });
});
