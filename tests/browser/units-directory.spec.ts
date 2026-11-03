import { expect, test } from "@playwright/test";

test.describe("Public Units directory and detail", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the isolated QA database");

  const widths = [390, 768, 1024, 1440, 1920];

  test("directory cards preserve navigation and fit supported viewports", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/units");
      expect(response?.status(), `directory status at ${width}px`).toBe(200);
      await expect(page.getByRole("heading", { name: "Units", level: 1 })).toBeVisible();
      const card = page.locator(".unit-directory-card").first();
      await expect(card).toBeVisible();
      const reveal = card.locator(".unit-directory-reveal");
      await expect(reveal).toBeHidden();
      await expect(card.locator(".unit-directory-title h2")).toBeVisible();
      await expect(card.locator(".unit-directory-title .unit-commander-copy strong")).toBeVisible();
      await expect(card.locator(".unit-directory-title .unit-quick-label")).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document, `page-level overflow at ${width}px`)
        .toBeLessThanOrEqual(dimensions.viewport + 1);

      if (width === 1440) {
        await card.hover();
        await expect(reveal).toBeVisible();
        const transitionDuration = await reveal.evaluate((element) =>
          getComputedStyle(element).transitionDuration,
        );
        expect(transitionDuration).toContain("0.28s");
        await expect(reveal.getByText("Members", { exact: true })).toBeVisible();
        await expect(reveal.getByText("Descendants", { exact: true })).toBeVisible();
        await expect(reveal.getByText(/audits|tickets|flag captures/i)).toHaveCount(0);
        await page.screenshot({
          path: testInfo.outputPath("units-directory-desktop.png"),
          fullPage: true,
        });
      }

      if (width === 390) {
        await expect(reveal).toBeHidden();
        await page.screenshot({
          path: testInfo.outputPath("units-directory-mobile.png"),
          fullPage: true,
        });
      }
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/units");
    const firstCard = page.locator(".unit-directory-card").first();
    await firstCard.focus();
    await expect(firstCard.locator(".unit-directory-reveal")).toBeVisible();

    await page.goto("/units");
    const expandableRoot = page.locator(".unit-directory-node:has(.unit-directory-expand)").first();
    const rootHref = await expandableRoot.locator(".unit-directory-card").getAttribute("href");
    expect(rootHref).toMatch(/^\/units\//);

    const expand = expandableRoot.locator(".unit-directory-expand").first();
    await expand.click();
    await expect(expand).toHaveAttribute("aria-expanded", "true");
    await expect(expandableRoot.locator("ul.unit-directory-children .unit-directory-card").first()).toBeVisible();
    await expect(errors, "browser runtime errors").toEqual([]);
  });

  test("detail identity and centered family tree fit supported viewports", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    const rootHref = "/units/demo-unit-coalition-command";

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(rootHref);
      expect(response?.status(), `detail status at ${width}px`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const tree = page.getByRole("region", { name: "Organization family tree" });
      await expect(tree).toBeVisible();
      const nodeLinks = tree.locator(".unit-org-node-link");
      const rootNode = nodeLinks.first();
      await expect(rootNode).toHaveAttribute("data-root", "true");
      const selectedNode = tree.locator('.unit-org-node-link[aria-current="page"]');
      await expect(selectedNode).toHaveAttribute("href", rootHref);
      const connectors = tree.locator(".unit-org-connectors > path");
      await expect(connectors.first()).toBeAttached();
      expect(await connectors.count()).toBe((await nodeLinks.count()) - 1);
      await expect(connectors.first()).toHaveAttribute("marker-end", /unit-tree-arrow/);
      const rootBox = await rootNode.boundingBox();
      const regionBox = await tree.boundingBox();
      expect(rootBox).not.toBeNull();
      expect(regionBox).not.toBeNull();
      await expect.poll(async () => {
        const centeredRoot = await rootNode.boundingBox();
        const centeredRegion = await tree.boundingBox();
        if (!centeredRoot || !centeredRegion) return Number.POSITIVE_INFINITY;
        return Math.abs(
          (centeredRoot.x + centeredRoot.width / 2) -
          (centeredRegion.x + centeredRegion.width / 2),
        );
      }).toBeLessThan(3);

      const siblings = tree.locator('.unit-org-node-link[aria-level="3"]');
      const siblingBoxes = await siblings.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right };
        }),
      );
      expect(siblingBoxes.length).toBeGreaterThan(1);
      for (let index = 1; index < siblingBoxes.length; index += 1) {
        expect(siblingBoxes[index].left).toBeGreaterThanOrEqual(siblingBoxes[index - 1].right);
      }

      const nodeLink = nodeLinks.nth(1);
      await expect(nodeLink.locator(".unit-org-reveal")).toBeHidden();
      await nodeLink.hover();
      await expect(nodeLink.locator(".unit-org-reveal")).toBeVisible();
      await expect(nodeLink.getByText("Descendants", { exact: true })).toBeVisible();
      await page.mouse.move(0, 0);

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document, `page-level overflow at ${width}px`)
        .toBeLessThanOrEqual(dimensions.viewport + 1);

      if (width === 1440) {
        await page.screenshot({
          path: testInfo.outputPath("unit-detail-desktop.png"),
          fullPage: true,
        });
        await tree.screenshot({
          path: testInfo.outputPath("organization-family-tree-desktop.png"),
        });
      }

      if (width === 390) {
        await tree.screenshot({
          path: testInfo.outputPath("organization-family-tree-mobile.png"),
        });
      }
    }
    await expect(errors, "browser runtime errors").toEqual([]);
  });
});
