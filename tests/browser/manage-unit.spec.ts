import { expect, test } from "@playwright/test";

test.describe("Manage Unit presentation", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Development sign-in is unavailable in production.");

  test("keeps unit identity, management sections, and forms usable across viewports", async ({ page }, testInfo) => {
    const signInResponse = await page.goto("/dev/sign-in");
    test.skip(signInResponse?.status() !== 200, "Development sign-in is not enabled for this browser target.");

    const managerForm = page.locator("form").filter({
      has: page.locator('input[name="userId"][value="demo-user-manager-french"]'),
    });
    test.skip(await managerForm.count() !== 1, "The seeded French manager identity is unavailable.");

    try {
      await managerForm.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL("**/units");

      const response = await page.goto("/units/demo-unit-french-guard/manage");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: /Königliches Gardek/, level: 1 })).toBeVisible();
      await expect(page.locator('dl[aria-label="Unit summary"]')).toContainText("Members4");
      await expect(page.getByRole("link", { name: "Manage roster" })).toHaveAttribute(
        "href",
        "/units/demo-unit-french-guard#roster-heading",
      );
      await expect(page.getByRole("heading", { name: "Public Profile" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Garde-Jäger Brigade" })).toBeVisible();

      for (const width of [390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        const pageWidth = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(pageWidth.document, `page-level horizontal overflow at ${width}px`)
          .toBeLessThanOrEqual(pageWidth.viewport + 1);
        if (width === 390 || width === 1440) {
          await page.screenshot({
            path: testInfo.outputPath(`manage-unit-${width}.png`),
            fullPage: true,
          });
        }
      }

      await page.getByText("Edit profile", { exact: true }).click();
      const profile = page.getByRole("region", { name: "Public Profile" });
      await expect(profile.getByLabel("Unit name")).toHaveValue("Königliches Gardekоrps");
      await expect(profile.getByLabel("Description")).toBeVisible();
      await expect(profile.getByLabel("Discord invite")).toBeVisible();
      await expect(profile.getByLabel("External group link")).toBeVisible();

      const permissions = page.getByRole("region", { name: "Permissions" });
      await permissions.locator("summary").filter({ hasText: "Add authorized User" }).click();
      await expect(permissions.getByLabel("Website account email")).toBeVisible();
      await expect(permissions.getByLabel("Authority level").first()).toBeVisible();

      await page.getByRole("link", { name: "Manage roster" }).click();
      await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
      await expect(page.getByText("4 active", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Add an existing Player" })).toBeVisible();
    } finally {
      const signOut = page.getByRole("button", { name: /sign out/i });
      if (await signOut.count()) {
        await signOut.click();
        await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
      }
    }
  });
});
