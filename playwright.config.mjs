import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30000,
  retries: 0,
  use: {
    browserName: "chromium",
  },
});
