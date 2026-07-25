import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-recette",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "e2e-recette/report/results.json" }]],
  use: {
    baseURL: "http://localhost:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
