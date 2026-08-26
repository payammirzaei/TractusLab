import { defineConfig, devices } from "@playwright/test";

const apiURL = "http://127.0.0.1:8000";
const webURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: webURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000",
      url: `${apiURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: "sqlite+pysqlite:///./e2e_tractuslab.db",
        FRONTEND_ORIGIN: webURL,
        EXPOSE_DEV_TOKENS: "true",
        EMAIL_DELIVERY_MODE: "disabled",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      url: webURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiURL,
      },
    },
  ],
});
