import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } }
  ],
  webServer: process.env.CI ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true }
});
