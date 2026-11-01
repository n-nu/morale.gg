import { expect, test, type Page } from "@playwright/test";

async function signInAsRoot(page: Page) {
  await page.goto("/dev/sign-in");
  await page.locator("form").filter({ has: page.locator('input[value="demo-user-root-commander"]') })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/units$/);
}

const publicRoutes = [
  "/dev/sign-in",
  "/statistics",
  "/leaderboard",
  "/events",
  "/events/demo-event-main-review",
];
const managerRoutes = [
  "/units/demo-unit-french-army/manage",
  "/events/demo-event-main-review/manage",
  "/audits",
];

test.describe("Ticket 43 final M2 viewport verification", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the isolated QA database");

  for (const width of [390, 768, 1440]) {
    test(`public, Leaderboard, Battle Structure, and manager routes at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      for (const route of publicRoutes) {
        const response = await page.goto(route);
        expect(response?.status(), `${route}: HTTP`).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(dimensions.document, `${route}: page-level horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
        if (route === "/events/demo-event-main-review") {
          await expect(page.getByRole("heading", { name: "Battle Structure" })).toBeVisible();
        }
      }

      await page.goto("/leaderboard");
      await expect(page.getByRole("tablist", { name: "Statistics window" })).toBeVisible();
      await expect(page.getByRole("group", { name: "Branch" })).toBeVisible();
      await page.getByRole("link", { name: "K/D", exact: true }).click();
      await expect(page.getByRole("columnheader", { name: /K\/D/ })).toHaveAttribute("aria-sort", "descending");
      await page.getByRole("link", { name: "Commanders", exact: true }).click();
      await expect(page).toHaveURL(/board=commanders/);
      await page.getByRole("tab", { name: "Select All Time window" }).click();
      await expect(page).toHaveURL(/window=all-time/);
      await page.getByRole("navigation", { name: "Leaderboard boards" })
        .getByRole("link", { name: "Units", exact: true })
        .click();
      await expect(page).toHaveURL(/board=units/);
      await page.getByRole("group", { name: "Branch" }).getByRole("link", { name: /Rifles/ }).click();
      await expect(page).toHaveURL(/type=rifles/);
      const tableDimensions = await page.getByTestId("leaderboard-scroll").evaluate((container) => ({
        clientWidth: container.clientWidth,
        scrollWidth: container.scrollWidth,
      }));
      if (width <= 768) {
        expect(tableDimensions.scrollWidth, "wide table remains locally scrollable").toBeGreaterThan(tableDimensions.clientWidth);
      }
      await page.screenshot({ path: testInfo.outputPath("leaderboard-units-rifles.png"), fullPage: true });

      await signInAsRoot(page);
      for (const route of managerRoutes) {
        const response = await page.goto(route);
        expect(response?.status(), `${route}: HTTP`).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(dimensions.document, `${route}: page-level horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
        if (route.endsWith("/events/demo-event-main-review/manage")) {
          const structure = page.locator("#battle-structure");
          await expect(structure).toBeVisible();
          const metrics = await page.evaluate(() => {
            const root = document.querySelector("#battle-structure");
            return {
              viewport: window.innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              pageHeight: document.documentElement.scrollHeight,
              structureHeight: root?.scrollHeight ?? 0,
              groups: root?.querySelectorAll("details[open]").length ?? 0,
            };
          });
          console.log(`QA42-UI1 ${width}px ${JSON.stringify(metrics)}`);
          if (width === 390) {
            await page.screenshot({ path: testInfo.outputPath("event-manager-battle-structure-390.png"), fullPage: true });
          }
        }
      }
      expect(errors, "browser runtime errors").toEqual([]);
    });
  }
});
