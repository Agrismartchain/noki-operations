import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/brand/noki-logo-sidebar.png", () => ({ default: { src: "/noki-logo.png", width: 480, height: 384 } }));

const { AuthSplitLayout } = await import("./auth-split-layout");

const baseProps = {
  backgroundUrl: "/bg/admin.svg",
  logoAlt: "NOKI",
  brandName: "NOKI SERVICE",
  panelLabel: "Console",
  eyebrow: "Console d’administration",
  headline: "Pilotez NOKI",
  subtext: "Supervision",
  highlights: ["Accès par rôle", "Traçabilité", "Supervision unifiée"],
  controls: <div data-testid="controls">controls</div>,
  footerText: "© 2026 NOKI — Tous droits réservés",
};

describe("AuthSplitLayout", () => {
  it("renders the portal background, one strong NOKI logo with a real accessible name, the form and the footer", () => {
    render(
      <AuthSplitLayout {...baseProps}>
        <form aria-label="login">form</form>
      </AuthSplitLayout>,
    );

    const panel = screen.getByTestId("auth-visual-panel");
    expect(panel.getAttribute("style")).toContain('url("/bg/admin.svg")');
    expect(panel.getAttribute("data-noki-theme")).toBe("dashboard-dark");

    const logos = screen.getAllByRole("img", { name: "NOKI" });
    expect(logos).toHaveLength(1);
    expect(logos[0]?.getAttribute("src")).toBe("/noki-logo.png");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(panel).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("form", { name: "login" })).toBeTruthy();
    expect(screen.getByTestId("controls")).toBeTruthy();
    expect(screen.getByTestId("auth-footer").textContent).toBe("© 2026 NOKI — Tous droits réservés");
  });

  it("omits optional highlights, controls and footer when not provided", () => {
    render(
      <AuthSplitLayout {...baseProps} highlights={[]} controls={undefined} footerText={undefined}>
        <div>child</div>
      </AuthSplitLayout>,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByTestId("controls")).toBeNull();
    expect(screen.queryByTestId("auth-footer")).toBeNull();
  });
});
