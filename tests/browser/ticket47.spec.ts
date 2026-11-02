import { expect, test } from "@playwright/test";

test.describe("Public Event Battle Structure", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the isolated QA database");

  for (const width of [390, 768, 1024, 1440, 1920]) {
    test(`public structure is readable and navigable at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto("/events/demo-event-waterloo-review");
      expect(response?.status()).toBe(200);

      const structure = page.getByRole("region", { name: "Battle Structure" });
      const statistics = page.getByRole("region", { name: "Event Statistics" });
      await expect(structure).toBeVisible();
      await expect(statistics).toBeVisible();
      await expect(structure.getByRole("heading", { name: "Attackers" })).toBeVisible();
      await expect(structure.getByRole("heading", { name: "Defenders" })).toBeVisible();
      await expect(structure.getByRole("link", { name: /Jump to Attackers/ })).toHaveAttribute("href", "#battle-attackers");
      await expect(structure.getByRole("link", { name: /Jump to Defenders/ })).toHaveAttribute("href", "#battle-defenders");
      await expect(structure.getByText("Company", { exact: true }).first()).toBeVisible();
      await expect(structure.getByText("Command Group", { exact: true }).first()).toBeVisible();
      await expect(structure.getByText(/Finalized|Results pending/).first()).toBeVisible();
      await expect(structure.getByText("Finalized", { exact: true }).first()).toBeVisible();
      await expect(statistics.getByRole("columnheader", { name: "Player Count" })).toBeVisible();
      await expect(statistics.getByRole("columnheader", { name: "Stars" })).toBeVisible();
      await expect(statistics.getByText("Tickets", { exact: true }).first()).toBeVisible();
      await expect(structure.locator("#battle-attackers")).toHaveAttribute("data-outcome", "winner");
      await expect(structure.locator("#battle-defenders")).toHaveAttribute("data-outcome", "loss");
      await expect(structure.getByText("Event result: Attackers won")).toBeVisible();
      await expect(structure.getByText(/Atomic Units?/)).toHaveCount(0);
      expect(await structure.locator("#battle-attackers h4").count()).toBeGreaterThan(1);
      expect(await structure.locator("#battle-defenders h4").count()).toBeGreaterThan(1);
      expect(await structure.locator('a[href^="/units/"]').count()).toBeGreaterThan(0);
      expect(await structure.locator('a[href^="/players/"]').count()).toBeGreaterThan(0);
      expect(await structure.getByRole("img", { name: /Unit icon$/ }).count()).toBeGreaterThan(0);

      const attackerBox = await structure.locator("#battle-attackers").boundingBox();
      const defenderBox = await structure.locator("#battle-defenders").boundingBox();
      expect(attackerBox).not.toBeNull();
      expect(defenderBox).not.toBeNull();
      if (attackerBox && defenderBox) {
        if (width >= 1024) {
          expect(defenderBox.x).toBeGreaterThan(attackerBox.x);
          expect(Math.abs(defenderBox.y - attackerBox.y)).toBeLessThan(2);
        } else {
          expect(defenderBox.y).toBeGreaterThan(attackerBox.y);
        }
      }

      const pageDimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(pageDimensions.document, "page-level horizontal overflow").toBeLessThanOrEqual(pageDimensions.viewport + 1);
      const leaderboardDimensions = await statistics.locator("div.overflow-x-auto").evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      if (width < 1920) {
        expect(leaderboardDimensions.scrollWidth).toBeGreaterThan(leaderboardDimensions.clientWidth);
      } else {
        expect(leaderboardDimensions.scrollWidth).toBeLessThanOrEqual(leaderboardDimensions.clientWidth);
      }
      await page.screenshot({
        path: testInfo.outputPath(`public-event-statistics-winner-${width}.png`),
        fullPage: true,
      });

      const groupHeading = structure.getByRole("heading", { name: "Allied Centre", exact: true });
      await expect(groupHeading).toBeVisible();
      const groupCard = groupHeading.locator("xpath=ancestor::li[1]");
      const groupDisclosure = groupCard.locator("details").first();
      await expect(groupDisclosure).toHaveJSProperty("open", true);
      const containedNodes = groupDisclosure.locator(":scope > ul > li");
      expect(await containedNodes.count()).toBeGreaterThan(0);
      const groupSummary = groupDisclosure.locator(":scope > summary");
      expect(await groupSummary.locator("a").count()).toBe(0);
      await groupSummary.focus();
      await groupSummary.press("Enter");
      await expect(groupDisclosure).toHaveJSProperty("open", false);
      await expect(containedNodes.first()).toBeHidden();
      await expect(groupCard.locator(":scope > div").first().getByText(/\d+ Companies?/)).toBeVisible();
      await groupSummary.press("Enter");
      await expect(groupDisclosure).toHaveJSProperty("open", true);
      await expect(containedNodes.first()).toBeVisible();

      const companyDetails = structure.getByText("Participating Players", { exact: true }).first();
      await companyDetails.click();
      await expect(structure.getByRole("region", { name: "Participating players" }).first()).toBeVisible();
      await expect(structure.getByRole("region", { name: "Company statistics" })).toHaveCount(0);

      const afterInteraction = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(afterInteraction.document, "page-level horizontal overflow after expanding details")
        .toBeLessThanOrEqual(afterInteraction.viewport + 1);
      expect(errors, "browser runtime errors").toEqual([]);
    });
  }

  test("draw and no-conclusion states are distinct on seeded Events", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/events/demo-event-borodino-review");
    const drawStructure = page.getByRole("region", { name: "Battle Structure" });
    await expect(drawStructure.locator("#battle-attackers")).toHaveAttribute("data-outcome", "draw");
    await expect(drawStructure.locator("#battle-defenders")).toHaveAttribute("data-outcome", "draw");
    await expect(drawStructure.getByText("Event result: Draw")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("public-event-statistics-draw-1440.png"),
      fullPage: true,
    });

    await page.goto("/events/demo-event-organizer-review");
    const neutralStructure = page.getByRole("region", { name: "Battle Structure" });
    await expect(neutralStructure.locator("#battle-attackers")).not.toHaveAttribute("data-outcome", /.+/);
    await expect(neutralStructure.locator("#battle-defenders")).not.toHaveAttribute("data-outcome", /.+/);
    await expect(neutralStructure.getByText(/Event result:/)).toHaveCount(0);
    await expect(neutralStructure.getByText(/Winner|Loss|Draw|Not recorded/)).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, "page-level horizontal overflow").toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.screenshot({
      path: testInfo.outputPath("public-event-statistics-no-conclusion-1440.png"),
      fullPage: true,
    });
  });
});
