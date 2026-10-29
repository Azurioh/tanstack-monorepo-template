import { defineConfig, devices } from "@playwright/test";

const PORT = 4310;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // In CI the HTML report is uploaded as an artifact when the e2e job fails (.github/workflows/ci.yml).
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      LOG_LEVEL: "warn",
      // Owned by the greeting feature (greetingEnv in its server.ts); removed with it.
      GREETING_HISTORY_LIMIT: "10",
    },
  },
});
