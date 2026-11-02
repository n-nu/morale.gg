import { expect, test, type Page } from "@playwright/test";

test.describe("Ticket 45 Event battle-structure manager presentation", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the isolated QA database");

  async function signInAsEventManager(page: Page) {
    await page.goto("/dev/sign-in");
    const signOut = page.getByRole("button", { name: "Sign out", exact: true });
    if (await signOut.count()) {
      await signOut.click();
      await page.goto("/dev/sign-in");
    }
    await page.locator("form").filter({ has: page.locator('input[value="demo-user-manager-french"]') })
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/units$/);
  }

  for (const width of [390, 768, 1440]) {
    test(`organizer is legible and usable at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await signInAsEventManager(page);

      const response = await page.goto("/events/demo-event-main-review/manage");
      expect(response?.status()).toBe(200);
      const structure = page.locator("#battle-structure");
      await expect(structure).toBeVisible();
      await expect(structure.getByRole("heading", { name: "DEFENDERS" })).toBeVisible();
      await expect(structure.getByRole("heading", { name: "ATTACKERS" })).toBeVisible();
      await expect(structure.getByText("Command Group", { exact: true }).first()).toBeVisible();
      await expect(structure.getByText("Company", { exact: true }).first()).toBeVisible();
      await expect(structure.getByText("Command groups contain companies and child groups.", { exact: true })).toBeVisible();
      await expect(structure.locator('button[aria-label^="Drag "]')).toHaveCount(0);
      await expect(structure.locator('[class~="border-l"]')).toHaveCount(0);
      await expect(structure.getByRole("group", { name: "Drop units or groups in defenders" })).toBeVisible();

      const namedGroupNode = structure.locator('[data-node-type="group"]').filter({ hasText: "I Corps" }).first();
      const groupId = await namedGroupNode.getAttribute("data-node-id");
      expect(groupId).toBeTruthy();
      const groupNode = structure.locator(`[data-node-type="group"][data-node-id="${groupId}"]`);
      const atomicNode = groupNode.locator('[data-node-type="atomic"]').first();
      await expect(groupNode).toHaveAttribute("draggable", "true");
      await expect(atomicNode).toHaveAttribute("draggable", "true");
      await expect(atomicNode).toBeVisible();
      await expect(atomicNode).toHaveAttribute("aria-label", /^Draggable Company:/);
      await expect(atomicNode).toHaveAttribute("title", /^Drag this Company/);
      const groupDropTarget = structure.locator(`[data-destination="group:${groupId}"]`);
      await expect(groupDropTarget.locator(`[data-node-id="${groupId}"]`)).toHaveCount(1);
      expect(await groupNode.locator('[data-node-type="atomic"]').count()).toBeGreaterThan(0);
      const atomicParentGroupId = await atomicNode.evaluate((element) => element.closest<HTMLElement>('[data-node-type="group"]')?.dataset.nodeId ?? null);
      expect(atomicParentGroupId).toBeTruthy();

      const atomicDrag = await atomicNode.evaluate((element) => {
        const event = new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
        element.dispatchEvent(event);
        return { prevented: event.defaultPrevented, type: event.dataTransfer?.getData("application/x-morale-battle-node") };
      });
      expect(atomicDrag.prevented).toBe(false);
      expect(atomicDrag.type).toContain('"type":"atomic"');
      await expect(atomicNode).toHaveAttribute("data-dragging", "true");
      await expect(groupNode).toHaveAttribute("data-dragging", "false");

      const validHover = await groupDropTarget.evaluate((element) => {
        const event = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(validHover).toBe(true);
      await expect(groupDropTarget).toHaveAttribute("data-drop-state", "valid");

      const groupDrag = await groupNode.evaluate((element) => {
        const event = new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(groupDrag).toBe(false);
      await expect(groupNode).toHaveAttribute("data-dragging", "true");
      const invalidHover = await groupDropTarget.evaluate((element) => {
        const event = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(invalidHover).toBe(true);
      await expect(groupDropTarget).toHaveAttribute("data-drop-state", "invalid");
      await expect(groupDropTarget).toHaveAccessibleName(/invalid destination/);
      await groupNode.evaluate((element) => element.dispatchEvent(new DragEvent("dragend", { bubbles: true })));
      await groupDropTarget.evaluate((element) => element.dispatchEvent(new DragEvent("dragleave", { bubbles: true })));

      const actions = groupNode.locator('summary[aria-label="Actions for command group I Corps"]');
      const controlDrag = await actions.evaluate((element) => {
        const event = new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(controlDrag).toBe(true);
      await expect(groupNode).toHaveAttribute("data-dragging", "false");
      await actions.click();
      const actionsPanel = actions.locator("xpath=../div");
      for (const control of [
        actionsPanel.locator('input[name="name"]'),
        actionsPanel.locator('select[name="commanderPlayerId"]'),
        actionsPanel.getByRole("button", { name: "Save", exact: true }),
      ]) {
        const prevented = await control.evaluate((element) => {
          const event = new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        });
        expect(prevented).toBe(true);
      }
      await expect(groupNode).toHaveAttribute("data-dragging", "false");
      const moveMenu = actionsPanel.getByText("Move to...", { exact: true });
      await expect(moveMenu).toBeVisible();
      await moveMenu.click();
      await expect(groupNode.getByRole("button", { name: "Move", exact: true })).toBeVisible();
      await actions.click();

      await atomicNode.evaluate((element) => element.dispatchEvent(new DragEvent("dragend", { bubbles: true })));
      await groupNode.evaluate((element) => element.dispatchEvent(new DragEvent("dragend", { bubbles: true })));

      if (width === 1440) {
        const attackers = structure.getByRole("region", { name: "ATTACKERS" });
        const defenders = structure.getByRole("region", { name: "DEFENDERS" });
        const attackersRoot = structure.getByRole("group", { name: "Drop units or groups in attackers" });
        const defendersRoot = structure.getByRole("group", { name: "Drop units or groups in defenders" });
        const atomicId = await atomicNode.getAttribute("data-node-id");
        expect(atomicId).toBeTruthy();
        const atomicParentDropTarget = structure.locator(`[data-destination="group:${atomicParentGroupId}"]`);
        const atomicParentGroup = structure.locator(`[data-node-type="group"][data-node-id="${atomicParentGroupId}"]`);

        await atomicNode.dragTo(attackersRoot);
        await expect(attackers.locator(`[data-node-id="${atomicId}"]`)).toHaveCount(1);
        await structure.locator(`[data-node-type="atomic"][data-node-id="${atomicId}"]`).dragTo(atomicParentDropTarget, { targetPosition: { x: 80, y: 18 } });
        await expect(atomicParentGroup.locator(`[data-node-id="${atomicId}"]`)).toHaveCount(1);

        await groupNode.dragTo(attackersRoot, { sourcePosition: { x: 80, y: 18 } });
        await expect(attackers.locator(`[data-node-id="${groupId}"]`)).toHaveCount(1);
        await structure.locator(`[data-node-type="group"][data-node-id="${groupId}"]`).dragTo(defendersRoot, { sourcePosition: { x: 80, y: 18 } });
        await expect(defenders.locator(`[data-node-id="${groupId}"]`)).toHaveCount(1);
        await expect(groupNode.locator(`[data-node-id="${atomicId}"]`)).toHaveCount(1);
      }

      const metrics = await page.evaluate(() => {
        const element = document.querySelector<HTMLElement>("#battle-structure");
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
          structureHeight: element?.scrollHeight ?? 0,
        };
      });
      expect(metrics.documentWidth, "page-level horizontal overflow").toBeLessThanOrEqual(metrics.viewport + 1);
      console.log(`Ticket 45 ${width}px ${JSON.stringify(metrics)}`);
      await page.screenshot({ path: testInfo.outputPath(`event-battle-structure-${width}.png`), fullPage: true });
    });
  }
});
