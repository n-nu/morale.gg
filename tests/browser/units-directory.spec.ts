import { expect, test } from "@playwright/test";

test.describe("Public Units directory and detail", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the isolated QA database");

  const widths = [390, 768, 1024, 1440, 1920];

  test("directory shows top-level Unit cards without rendering descendant trees", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/units");
      expect(response?.status(), `directory status at ${width}px`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const cards = page.locator(".unit-directory-card");
      await expect(cards.first()).toBeVisible();
      await expect(page.locator(".unit-directory-expand, .unit-directory-children")).toHaveCount(0);
      await expect(page.locator(".unit-directory-node")).toHaveCount(await cards.count());
      const card = cards.first();
      const reveal = card.locator(".unit-directory-reveal");
      await expect(reveal).toBeHidden();
      await expect(card.locator(".unit-directory-title h2")).toBeVisible();
      await expect(card.locator(".unit-directory-title .unit-commander-copy strong")).toBeVisible();
      await expect(card.locator(".unit-directory-subunit-count")).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document, `page-level overflow at ${width}px`)
        .toBeLessThanOrEqual(dimensions.viewport + 1);

      if (width === 1440) {
        await card.hover();
        await expect(reveal).toBeVisible();
        await expect(reveal.getByText("Members", { exact: true })).toBeVisible();
        await expect(reveal.getByText("Subunits", { exact: true })).toBeVisible();
        await expect(reveal.getByText("Descendants", { exact: true })).toBeVisible();
        await expect(reveal.getByText(/audits|tickets|flag captures/i)).toHaveCount(0);
        await page.screenshot({
          path: testInfo.outputPath("units-directory-desktop.png"),
          fullPage: true,
        });
      }

      if (width === 390) {
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
    await expect(errors, "browser runtime errors").toEqual([]);
  });

  test("detail focuses the selected subtree and wraps sibling branches at all supported viewports", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/units");
    const directoryEntryHref = await page.locator(".unit-directory-card").first().getAttribute("href");
    expect(directoryEntryHref).toMatch(/^\/units\//);
    await page.goto(directoryEntryHref!);
    const ancestors = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link");
    expect(await ancestors.count()).toBeGreaterThan(2);
    const rootHref = await ancestors.last().getAttribute("href");
    expect(rootHref).toMatch(/^\/units\//);
    let firstChildHref = "";
    let rootName = "";

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(rootHref!);
      expect(response?.status(), `detail status at ${width}px`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const tree = page.getByRole("region", { name: "Organization family tree" });
      await expect(tree).toBeVisible();
      const nodeLinks = tree.locator(".unit-org-node-link");
      const rootNode = tree.locator(".unit-org-item[data-depth=\"0\"] .unit-org-node-link").first();
      await expect(rootNode).toHaveAttribute("data-root", "true");
      await expect(rootNode).toHaveAttribute("aria-current", "page");
      await expect(rootNode).toHaveAttribute("href", rootHref!);
      rootName = await rootNode.locator(".unit-org-node-identity > strong").innerText();

      const directChildren = tree.locator('.unit-org-children > .unit-org-item[data-depth="1"]');
      const directChildCount = await directChildren.count();
      expect(directChildCount).toBeGreaterThan(0);
      expect(await nodeLinks.count()).toBe(directChildCount + 1);
      const branchLines = await tree.locator('.unit-org-item[data-depth="0"] > .unit-org-children')
        .evaluate((element) => ({
          trunk: getComputedStyle(element, "::after").borderLeftWidth,
          parentRail: getComputedStyle(element, "::before").borderTopWidth,
          childBranch: getComputedStyle(element.querySelector(".unit-org-item")!, "::before").borderTopWidth,
        }));
      expect(branchLines).toEqual({
        trunk: "1px",
        parentRail: "1px",
        childBranch: "1px",
      });
      const rootToggle = tree.locator(".unit-org-item[data-depth=\"0\"] .unit-org-expand").first();
      await expect(rootToggle).toHaveAttribute("aria-expanded", "true");
      await expect(rootToggle).toHaveAccessibleName(new RegExp(`Hide ${directChildCount} subunits`));

      const nestedToggle = tree.locator('.unit-org-item[data-depth="1"] .unit-org-expand').first();
      await expect(nestedToggle).toHaveAttribute("aria-expanded", "false");
      const nestedItem = tree.locator('.unit-org-item[data-depth="1"]').first();
      await nestedToggle.click();
      await expect(nestedToggle).toHaveAttribute("aria-expanded", "true");
      await expect(nestedItem.locator(".unit-org-children > .unit-org-item").first()).toBeVisible();

      const firstChild = directChildren.first().locator(".unit-org-node-link").first();
      firstChildHref = await firstChild.getAttribute("href") ?? "";
      expect(firstChildHref).toMatch(/^\/units\//);

      const wideSiblings = directChildren;
      const wideSiblingCount = await wideSiblings.count();
      expect(wideSiblingCount).toBeGreaterThan(1);
      const siblingBoxes = await wideSiblings.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }),
      );
      expect(Math.min(...siblingBoxes.map((box) => box.width))).toBeGreaterThanOrEqual(240);
      if (width === 390) {
        expect(siblingBoxes[1].y).toBeGreaterThan(siblingBoxes[0].y);
      }
      if (width >= 1440) {
        expect(new Set(siblingBoxes.map((box) => box.y)).size).toBeGreaterThan(1);
      }

      const treeDimensions = await tree.evaluate((element) => ({
        viewport: element.clientWidth,
        content: element.scrollWidth,
        height: element.scrollHeight,
      }));
      expect(treeDimensions.content, `tree width at ${width}px`)
        .toBeLessThanOrEqual(treeDimensions.viewport + 1);
      expect(treeDimensions.height).toBeGreaterThan(0);

      await nestedToggle.click();
      await expect(nestedToggle).toHaveAttribute("aria-expanded", "false");
      await nestedToggle.click();
      await expect(nestedToggle).toHaveAttribute("aria-expanded", "true");

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

      await rootToggle.click();
      await expect(rootToggle).toHaveAttribute("aria-expanded", "false");
      await expect(directChildren.first()).toBeHidden();
      await rootToggle.click();
      await expect(rootToggle).toHaveAttribute("aria-expanded", "true");
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(rootHref!);
    const tree = page.getByRole("region", { name: "Organization family tree" });
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Units" })).toBeVisible();
    await expect(breadcrumb.getByText(rootName, { exact: true })).toBeVisible();
    expect(await breadcrumb.innerText()).not.toMatch(/[a-z0-9]{20,}/i);

    await tree.locator(`a[href="${firstChildHref}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${firstChildHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    const focusedTree = page.getByRole("region", { name: "Organization family tree" });
    await expect(focusedTree.locator('.unit-org-node-link[aria-current="page"]'))
      .toHaveAttribute("href", firstChildHref);
    await expect(focusedTree.locator('.unit-org-item[data-depth="0"] > .unit-org-entry > .unit-org-node-link'))
      .toHaveAttribute("href", firstChildHref);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: rootName }))
      .toHaveAttribute("href", rootHref!);
    await expect(errors, "browser runtime errors").toEqual([]);
  });
});
