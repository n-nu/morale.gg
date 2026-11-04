import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

test("Award catalogs and public Player/Unit Awards fit supported viewports", async ({ page }, testInfo) => {
  test.skip(process.env.QA_PRODUCTION === "true", "Uses a temporary local database session and Award fixtures.");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must target the browser server's local test database.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const rootUnitId = process.env.AWARD_BROWSER_ROOT_ID ?? "root-morale-gg";
  const fixtureId = randomUUID();
  const playerAwardId = `award-ui-player-${fixtureId}`;
  const unitAwardId = `award-ui-unit-${fixtureId}`;
  const playerId = `award-ui-player-${fixtureId}`;
  const sessionToken = `award-ui-session-${fixtureId}`;
  const playerAwardName = `UI Player Award ${fixtureId}`;
  const unitAwardName = `UI Unit Award ${fixtureId}`;
  let playerInternalId: string | null = null;
  let awardsSchemaReady = false;

  try {
    const awardTables = await db.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('AwardDefinition', 'PlayerAwardGrant', 'UnitAwardGrant')
    `;
    if (awardTables.length !== 3) {
      throw new Error("Run this browser check against a database with the Awards migration applied.");
    }
    awardsSchemaReady = true;

    const root = await db.unit.findUniqueOrThrow({
      where: { id: rootUnitId },
      select: { commanderUserId: true },
    });
    const player = await db.player.create({ data: { playerId } });
    playerInternalId = player.id;
    await db.session.create({
      data: { sessionToken, userId: root.commanderUserId, expires: new Date(Date.now() + 10 * 60_000) },
    });
    await db.awardDefinition.createMany({
      data: [
        {
          id: playerAwardId,
          rootUnitId,
          category: "PLAYER",
          name: playerAwardName,
          description: "Accessible Player Award description.",
          imageRef: "/file.svg",
          sortOrder: -100000,
        },
        {
          id: unitAwardId,
          rootUnitId,
          category: "UNIT",
          name: unitAwardName,
          description: "Accessible Unit Award description.",
          imageRef: "/file.svg",
          sortOrder: -100000,
        },
      ],
    });
    await db.unitMembership.create({ data: { playerId: player.id, unitId: rootUnitId } });
    await db.playerAwardGrant.create({ data: { playerId, awardId: playerAwardId } });
    await db.unitAwardGrant.create({ data: { unitId: rootUnitId, awardId: unitAwardId } });
    await page.context().addCookies([{
      name: "authjs.session-token",
      value: sessionToken,
      url: testInfo.project.use.baseURL ?? "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    }]);

    await page.goto(`/units/${rootUnitId}/manage#structure`);
    const playerCatalog = page.getByRole("region", { name: "Player Awards", exact: true });
    const unitCatalog = page.getByRole("region", { name: "Unit Awards", exact: true });
    const playerRow = playerCatalog.locator(".units-award-row").filter({
      has: page.locator(`input[name="awardId"][value="${playerAwardId}"]`),
    });
    const unitRow = unitCatalog.locator(".units-award-row").filter({
      has: page.locator(`input[name="awardId"][value="${unitAwardId}"]`),
    });

    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(playerRow.locator(":scope > summary")).toContainText(playerAwardName);
      await expect(playerRow.locator(":scope > summary")).toContainText("1");
      await expect(unitRow.locator(":scope > summary")).toContainText(unitAwardName);
      const measurements = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(measurements.document, `management overflow at ${width}px`)
        .toBeLessThanOrEqual(measurements.viewport + 1);
      for (const catalog of [playerCatalog, unitCatalog]) {
        const offsets = await catalog.evaluate((element) => {
          const header = element.querySelector(".units-award-head")!;
          const summary = element.querySelector(".units-award-row > summary")!;
          return Array.from(summary.children).slice(0, 4).map((child, index) =>
            Math.abs(child.getBoundingClientRect().left - header.children[index].getBoundingClientRect().left),
          );
        });
        for (const offset of offsets) expect(offset).toBeLessThan(1);
      }
    }

    for (const route of [
      `/players/${encodeURIComponent(playerId)}`,
      `/units/${rootUnitId}`,
    ]) {
      for (const width of [390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(route);
        expect(response?.status(), `${route} at ${width}px`).toBe(200);
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(dimensions.document, `${route} overflow at ${width}px`)
          .toBeLessThanOrEqual(dimensions.viewport + 1);
      }
    }

    await page.goto(`/players/${encodeURIComponent(playerId)}`);
    await expect(page.getByRole("heading", { name: "Player Awards" })).toBeVisible();
    const playerMedal = page.getByRole("button", { name: `${playerAwardName} medal details` });
    await expect(playerMedal).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { name: playerAwardName })).toBeHidden();
    const performance = page.getByRole("region", { name: "Performance", exact: true });
    const performanceTop = await performance.evaluate((element) => element.getBoundingClientRect().top);
    await playerMedal.hover();
    await expect(playerMedal).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("heading", { name: playerAwardName })).toBeVisible();
    await expect(page.getByText("Accessible Player Award description.")).toBeVisible();
    await page.waitForTimeout(600);
    expect(await performance.evaluate((element) => element.getBoundingClientRect().top))
      .toBe(performanceTop);
    await page.getByText("Accessible Player Award description.").hover();
    await expect(playerMedal).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(0, 0);
    await expect(playerMedal).toHaveAttribute("aria-expanded", "false");
    await playerMedal.focus();
    await expect(playerMedal).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Accessible Player Award description.")).toBeVisible();
    await page.goto(`/units/${rootUnitId}`);
    await expect(page.getByRole("heading", { name: "Unit Awards" })).toBeVisible();
    await expect(page.getByRole("heading", { name: unitAwardName })).toBeVisible();
    await expect(page.getByText("Accessible Unit Award description.")).toHaveCount(1);
  } finally {
    try {
      if (awardsSchemaReady) {
        await db.$transaction(async (tx) => {
          await tx.playerAwardGrant.deleteMany({ where: { awardId: playerAwardId } });
          await tx.unitAwardGrant.deleteMany({ where: { awardId: unitAwardId } });
          if (playerInternalId) {
            await tx.unitMembership.deleteMany({ where: { playerId: playerInternalId } });
            await tx.player.delete({ where: { id: playerInternalId } });
          }
          await tx.awardDefinition.deleteMany({ where: { id: { in: [playerAwardId, unitAwardId] } } });
          await tx.session.deleteMany({ where: { sessionToken } });
        });
      }
    } finally {
      await db.$disconnect();
    }
  }
});
