import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const appDir = join(process.cwd(), "src/app");

function pngSize(file: string): { width: number; height: number; colorType: number } {
  const buffer = readFileSync(file);
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] ?? -1 };
}

describe("NOKI favicon set (app router file conventions, all locales and /login)", () => {
  it("ships a square 512px icon and a 180px apple icon derived from the brand artwork", () => {
    const icon = pngSize(join(appDir, "icon.png"));
    const apple = pngSize(join(appDir, "apple-icon.png"));
    expect(icon.width).toBe(512);
    expect(icon.height).toBe(512);
    expect(apple.width).toBe(180);
    expect(apple.height).toBe(180);
  });

  it("ships a multi-size favicon.ico (16/32/48)", () => {
    const file = join(appDir, "favicon.ico");
    expect(statSync(file).size).toBeGreaterThan(1_200);
    const ico = readFileSync(file);
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
    expect(sizes).toEqual([16, 32, 48]);
  });
});

describe("Admin control sizing override (design system untouched)", () => {
  const css = readFileSync(join(appDir, "globals.css"), "utf8");
  const block = /html\[data-noki-theme\^="dashboard"\][\s\S]*?\{([^}]*)\}/.exec(css)?.[1] ?? "";

  it("sets the standard control to 48px and the small control to at least 44px", () => {
    const md = /--noki-density-control-height-md:\s*(\d+)px/.exec(block)?.[1];
    const sm = /--noki-size-control-sm:\s*(\d+)px/.exec(block)?.[1];
    expect(Number(md)).toBe(48);
    expect(Number(sm)).toBeGreaterThanOrEqual(44);
  });

  it("does not override the large control token (already 48px, must not be enlarged twice)", () => {
    expect(block).not.toContain("--noki-size-control-lg");
  });

  it("is more specific than the design system's own theme and density token declarations", () => {
    expect(css).toContain('[data-noki-theme^="dashboard"][data-noki-theme]');
    expect(css).toContain('[data-noki-theme^="dashboard"] [data-density]');
  });
});

describe("Operations — shell sizing contract (NOKI Admin standard, Admin-layer CSS)", () => {
  const sidebarCss = readFileSync(join(process.cwd(), "src/components/shell/admin-sidebar-view.module.css"), "utf8");
  const shellCss = readFileSync(join(process.cwd(), "src/components/shell/admin-shell.module.css"), "utf8");

  it("sidebar is at least 18.5rem wide", () => {
    expect(sidebarCss).toMatch(/\.sidebar \{\s*min-inline-size: 18\.5rem;/);
    expect(shellCss).toMatch(/--app-shell-sidebar-width: 18\.5rem;/);
  });

  it("navigation items are 48px with the md font size and a 20px icon", () => {
    expect(sidebarCss).toMatch(/\.sidebar \.navItem \{[^}]*min-block-size: 48px;[^}]*font-size: var\(--noki-font-size-md\);/);
    expect(sidebarCss).toMatch(/\.sidebar \.navItem svg \{\s*inline-size: 20px;\s*block-size: 20px;/);
  });
});

describe("control-size contract (Admin layer)", () => {
  const css = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
  const globals = css("src/app/globals.css");

  it("defines the 48px standard and 44px compact variables, with the compact one inside table cells", () => {
    expect(globals).toMatch(/--admin-control-height: 48px;/);
    expect(globals).toMatch(/--admin-control-height-compact: 44px;/);
    expect(globals).toMatch(/main td,[\s\S]*?--admin-control-height: 44px;/);
  });

  it("has a safety net for raw buttons / sort buttons and class-less native fields, never touching [data-rac] inner inputs", () => {
    expect(globals).toMatch(/main :is\(button, \[role="button"\]\):not\(\[data-rac\], \[data-admin-compact-exempt\]\) \{\s*min-block-size: var\(--admin-control-height-compact\);/);
    expect(globals).toMatch(/main input:not\(\[data-rac\]/);
    expect(globals).toMatch(/main th :is\(button, \[role="button"\]\)[^{]*\{\s*min-block-size: var\(--admin-control-height-compact\);\s*margin-block: -14px;/);
  });

  it("Operations table row actions are compact interactive controls (44px)", () => {
    const tables = readFileSync(join(process.cwd(), "src/features/operations/components/ops-tables.module.css"), "utf8");
    expect(tables).toMatch(/\.rowAction \{[^}]*min-block-size: var\(--admin-control-height-compact, 44px\);/);
  });

  it("the DS mobile navigation trigger gets the 44px compact size", () => {
    expect(globals).toMatch(/\[class\*="_mobileTrigger_"\]:not\(\[data-admin-compact-exempt\]\) \{\s*block-size: var\(--admin-control-height-compact\);\s*inline-size: var\(--admin-control-height-compact\);[^}]*min-inline-size: var\(--admin-control-height-compact\);/);
  });

  it("does not modify the shared design system", () => {
    expect(globals).not.toMatch(/--noki-size-control-lg\s*:/);
  });
});

describe("LOT 01I finalisation — field border contrast contract (WCAG 1.4.11)", () => {
  const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  function luminance([r, g, b]: number[]): number {
    const [rl, gl, bl] = [r, g, b].map((v) => {
      const x = (v ?? 0) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (rl ?? 0) + 0.7152 * (gl ?? 0) + 0.0722 * (bl ?? 0);
  }
  function ratio(a: number[], b: number[]): number {
    const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  function rgbOf(block: string, name: string): number[] {
    const match = new RegExp(`${name}: rgb\\((\\d+) (\\d+) (\\d+)\\)`).exec(block);
    expect(match, `${name} declared as rgb()`).not.toBeNull();
    return [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
  }

  const lightBlock = /:root \{\s*--admin-field-border: [^}]*\}/.exec(globals.slice(globals.indexOf("field border contrast")))?.[0] ?? "";
  const darkBlock = /\[data-noki-theme="dashboard-dark"\] \{\s*--admin-field-border: [^}]*\}/.exec(globals)?.[0] ?? "";

  it("light idle/hover/focus colours reach 3:1 against white, the page background and the subtle surface", () => {
    for (const bg of [[255, 255, 255], [248, 248, 248], [245, 246, 248]]) {
      expect(ratio(rgbOf(lightBlock, "--admin-field-border"), bg)).toBeGreaterThanOrEqual(3);
      expect(ratio(rgbOf(lightBlock, "--admin-field-border-hover"), bg)).toBeGreaterThanOrEqual(3);
      expect(ratio(rgbOf(lightBlock, "--admin-field-focus"), bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("dark idle/hover colours reach 3:1 against the surface, the page background and the subtle surface", () => {
    for (const bg of [[22, 26, 36], [14, 17, 23], [28, 33, 48]]) {
      expect(ratio(rgbOf(darkBlock, "--admin-field-border"), bg)).toBeGreaterThanOrEqual(3);
      expect(ratio(rgbOf(darkBlock, "--admin-field-border-hover"), bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("overrides only field elements, keeps disabled/invalid semantics and outranks the design system hover rule", () => {
    expect(globals).toMatch(/\):not\(:disabled, \[aria-invalid="true"\], \[data-invalid="true"\], \[data-admin-field-exempt\]\) \{\s*border-color: var\(--admin-field-border\);/);
    // chained :not() calls (a :not() list counts once) so specificity beats the DS (0,4,0) hover rule
    expect(globals).toContain("):hover:not(:disabled):not(:read-only):not([aria-invalid=\"true\"]):not([data-invalid=\"true\"]):not([data-admin-field-exempt]) {");
    expect(globals).toMatch(/\[aria-invalid="true"\], \[data-invalid="true"\]\):not\(:disabled\):not\(\[data-admin-field-exempt\]\) \{\s*border-color: var\(--noki-color-semantic-danger\);/);
    expect(globals).not.toMatch(/--noki-color-semantic-border\s*:/);
  });
});

describe("LOT 01I (last correction) — small error text contrast (WCAG 1.4.3)", () => {
  const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const lum = (c: number[]) => {
    const [r = 0, g = 0, b = 0] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: number[], b: number[]) => { const [hi = 0, lo = 0] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const over = (fg: number[], alpha: number, bg: number[]) => fg.map((v, i) => Math.round(v * alpha + (bg[i] ?? 0) * (1 - alpha)));

  it("dark error text colour reaches 4.5:1 on the surface, page, subtle surface and the alert surface", () => {
    const match = /\[data-noki-theme="dashboard-dark"\] \{[^}]*--admin-danger-text: rgb\((\d+) (\d+) (\d+)\);/.exec(globals);
    expect(match, "dark --admin-danger-text declared as rgb()").not.toBeNull();
    const text = [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
    const alertSurface = (bg: number[]) => over([185, 28, 28], 0.24, bg);
    for (const bg of [[22, 26, 36], [14, 17, 23], [28, 33, 48], alertSurface([22, 26, 36]), alertSurface([14, 17, 23])]) {
      expect(ratio(text, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("light keeps the design-system danger colour (red-700, >= 4.5:1 on the light surfaces)", () => {
    expect(globals).toMatch(/:root \{[^}]*--admin-danger-text: var\(--noki-color-semantic-danger\);/);
    for (const bg of [[255, 255, 255], [248, 248, 248], [245, 246, 248], [253, 235, 236]]) expect(ratio([185, 28, 28], bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("recolours only error TEXT: field messages (_error_), never the border/icon tokens", () => {
    expect(globals).toMatch(/\[class\*="_error_"\]:not\(\[data-admin-error-exempt\]\) \{\s*color: var\(--admin-danger-text\);\s*\}/);
    expect(globals).not.toMatch(/--noki-color-semantic-danger\s*:/);
  });
});
