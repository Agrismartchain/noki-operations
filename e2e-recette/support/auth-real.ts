import { expect, type Page } from "@playwright/test";

const demoPassword =
  process.env.RECETTE_DEMO_PASSWORD ??
  process.env.NOKI_DEMO_PASSWORD ??
  process.env.RECETTE_OPERATIONS_PASSWORD ??
  process.env.RECETTE_CONTACT_CENTER_PASSWORD ??
  "";

export const RECETTE = {
  operationsEmail: process.env.RECETTE_OPERATIONS_EMAIL ?? "operations.demo@example.invalid",
  operationsPassword: process.env.RECETTE_OPERATIONS_PASSWORD ?? demoPassword,
  contactCenterEmail: process.env.RECETTE_CONTACT_CENTER_EMAIL ?? "contact.demo@example.invalid",
  contactCenterPassword: process.env.RECETTE_CONTACT_CENTER_PASSWORD ?? demoPassword,
  financeEmail: process.env.RECETTE_FINANCE_EMAIL ?? "finance01.demo@example.invalid",
  financePassword: process.env.RECETTE_FINANCE_PASSWORD ?? demoPassword,
  auditorEmail: process.env.RECETTE_AUDITOR_EMAIL ?? "auditor.demo@example.invalid",
  auditorPassword: process.env.RECETTE_AUDITOR_PASSWORD ?? demoPassword,
  superAdminEmail: process.env.RECETTE_SUPER_ADMIN_EMAIL ?? "superadmin.demo@example.invalid",
  superAdminPassword: process.env.RECETTE_SUPER_ADMIN_PASSWORD ?? demoPassword,
};

export async function loginReal(page: Page, email: string, password: string) {
  await page.goto("/fr/login", { waitUntil: "load" });
  await page.getByLabel(/e-mail|email/i).fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(password);
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /se connecter|sign in/i }).click(),
  ]);
  expect(response.status(), await response.text()).toBe(200);
  await page.waitForURL(/\/fr$/, { timeout: 10_000 });
}

export async function loginAsOperationsDemo(page: Page) {
  await loginReal(page, RECETTE.operationsEmail, RECETTE.operationsPassword);
}

export function collectAppConsoleIssues(page: Page) {
  const issues: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("bis_skin_checked") || text.includes("bis_register")) return;
    // Pre-hydration theme-init script (theme-initialization-script.tsx) is a literal
    // server-rendered <script> tag -- identical to noki-admin's own implementation --
    // used deliberately to set data-noki-theme before React hydrates and avoid a
    // flash of the wrong theme. React 19/Next 16 flags rendering a literal <script>
    // JSX element with this dev-only advisory; it does not affect the script actually
    // running (theme switching is exercised and screenshotted successfully).
    if (text.includes("Encountered a script tag while rendering React component")) return;
    if (message.type() === "error" || /hydration|did not match|500|404|unhandled/i.test(text)) {
      issues.push(`${message.type()}: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  return issues;
}

export async function assertNoNextOverlay(page: Page) {
  const overlayCount = await page.locator("[data-nextjs-dialog-overlay]").count();
  if (overlayCount > 0) {
    const overlayText = await page.locator("[data-nextjs-dialog-overlay]").innerText().catch(() => "");
    if (!overlayText.includes("Encountered a script tag while rendering React component")) {
      throw new Error(`Unexpected Next.js dev overlay: ${overlayText.slice(0, 500)}`);
    }
  }
  await expect(page.getByText(/Application error|Unhandled Runtime Error|NEXT_/i)).toHaveCount(0);
}
