import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: "http://127.0.0.1:5201", headless: true },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5201",
    reuseExistingServer: true,
  },
  reporter: "list",
});
