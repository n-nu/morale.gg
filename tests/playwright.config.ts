import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const outputName = process.env.QA_PRODUCTION === "true" ? "browser-production" : "browser";

export default defineConfig({
  testDir: "./browser",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: resolve("coverage", outputName),
  reporter: [["list"], ["json", { outputFile: resolve("coverage", `${outputName}-results.json`) }]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3100",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
