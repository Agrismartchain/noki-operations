import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/brand/noki-logo-sidebar.png", () => ({ default: { src: "/noki-logo.png", width: 480, height: 384 } }));

const { NokiLogo } = await import("./noki-logo");

describe("NokiLogo", () => {
  it("is decorative (empty alt, aria-hidden) unless an accessible name is given", () => {
    render(<NokiLogo testId="logo" />);
    const img = screen.getByTestId("logo");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("aria-hidden")).toBe("true");
    expect(img.getAttribute("width")).toBe("480");
    expect(img.getAttribute("height")).toBe("384");
  });

  it("exposes its accessible name when it is the only identity on screen", () => {
    render(<NokiLogo alt="NOKI" size="xl" />);
    const img = screen.getByRole("img", { name: "NOKI" });
    expect(img.getAttribute("aria-hidden")).toBeNull();
  });
});
