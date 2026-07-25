import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { SanitizedActor } from "@/lib/auth";

const sidebarViewMock = vi.fn((props: { navigation: Array<{ key: string }> }) => props);

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "fr"),
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("./admin-sidebar-view", () => ({
  AdminSidebarView: (props: { navigation: Array<{ key: string }> }) => sidebarViewMock(props),
}));

const { AdminSidebar } = await import("./admin-sidebar");

type SidebarElementProps = {
  navigation: Array<{ key: string }>;
};

const baseActor: SanitizedActor = {
  actorId: "actor-1",
  displayName: "Actor",
  email: null,
  memberships: [],
  effectivePermissionCodes: ["auth.me.read"],
  capabilities: [],
};

describe("AdminSidebar", () => {
  it("renders no navigation items when the actor has none of the OPERATIONS capabilities", async () => {
    const result = await AdminSidebar({ actor: baseActor });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    expect(result.props.navigation).toEqual([]);
  });

  it("renders no navigation items at all for an unauthenticated (undefined) actor", async () => {
    const result = await AdminSidebar({ actor: undefined });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    expect(result.props.navigation).toEqual([]);
  });

  it("shows only the dashboard when the actor holds only operations.read", async () => {
    const result = await AdminSidebar({
      actor: { ...baseActor, capabilities: ["operations.read"] },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    expect(result.props.navigation.map((item) => item.key)).toEqual(["dashboard"]);
  });

  it("shows the full real OPERATIONS role permission set as exactly the ten expected items", async () => {
    const result = await AdminSidebar({
      actor: {
        ...baseActor,
        capabilities: [
          "operations.read",
          "commerce.inbound.read",
          "inventory.stock.read",
          "fulfillment.task.pick",
          "fulfillment.task.pack",
          "commerce.qc.manage",
          "delivery.admin.read",
          "incidents.read",
        ],
      },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    expect(result.props.navigation.map((item) => item.key)).toEqual([
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

  it("never shows Finance, Users, or Governance style items, even with every capability granted", async () => {
    const result = await AdminSidebar({
      actor: {
        ...baseActor,
        capabilities: [
          "operations.read",
          "commerce.inbound.read",
          "inventory.stock.read",
          "fulfillment.task.pick",
          "fulfillment.task.pack",
          "commerce.qc.manage",
          "delivery.admin.read",
          "incidents.read",
          "finance.executive.read",
          "users.read",
          "audit.read",
        ],
      },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    const keys = result.props.navigation.map((item) => item.key);
    expect(keys).not.toContain("finance");
    expect(keys).not.toContain("users");
    expect(keys).not.toContain("governance");
  });

  it("shows only inventory-related items when only inventory.stock.read is granted", async () => {
    const result = await AdminSidebar({
      actor: { ...baseActor, capabilities: ["inventory.stock.read"] },
    });
    if (!isValidElement<SidebarElementProps>(result)) throw new Error("expected AdminSidebar to return a React element");

    expect(result.props.navigation.map((item) => item.key)).toEqual(["inventory", "movements"]);
  });
});
