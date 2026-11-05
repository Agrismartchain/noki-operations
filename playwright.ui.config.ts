import { defineConfig, devices } from "@playwright/test";

// UI regression suite (stub API, no real backend). Not part of CI by default, like the recette suite.
//   next build (standalone) + stub API (4601) + origin proxy (4500 -> 4501) so the production CSRF guard stays intact.
const APP_PORT = Number(process.env.NOKI_OPS_E2E_PORT ?? 4500);
const BACK_PORT = APP_PORT + 1;
const API_PORT = Number(process.env.NOKI_OPS_E2E_API_PORT ?? 4601);
const PUBLIC_ORIGIN = "https://operations.test";

export default defineConfig({
  testDir: "./e2e-ui",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  workers: process.env.CI ? undefined : 2,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: `node e2e-ui/support/stub-api-server.mjs ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `rm -rf .next && NODE_ENV=production NOKI_API_BASE_URL=http://127.0.0.1:${API_PORT} pnpm build && rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static && NODE_ENV=production NOKI_API_BASE_URL=http://127.0.0.1:${API_PORT} NOKI_PUBLIC_ORIGIN=${PUBLIC_ORIGIN} HOSTNAME=127.0.0.1 PORT=${BACK_PORT} node .next/standalone/server.js`,
      url: `http://127.0.0.1:${BACK_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: `node e2e-ui/support/origin-proxy.mjs ${APP_PORT} ${BACK_PORT} ${PUBLIC_ORIGIN}`,
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
