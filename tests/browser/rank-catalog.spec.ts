import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

test("rank rows and full-width editors remain readable and persist profile fields", async ({ page }, testInfo) => {
  test.skip(process.env.QA_PRODUCTION === "true", "Uses a temporary local database session and catalog fixtures.");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must target the browser server's local test database.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const rootId = "root-morale-gg";
  const fixtureId = randomUUID();
  const rankId = `rank-ui-${fixtureId}`;
  const legacyRankId = `rank-ui-legacy-${fixtureId}`;
  const sessionToken = `rank-ui-session-${fixtureId}`;
  const rankName = `Private ${fixtureId}`;
  try {
    const root = await db.unit.findUniqueOrThrow({ where: { id: rootId }, select: { commanderUserId: true } });
    await db.session.create({
      data: { sessionToken, userId: root.commanderUserId, expires: new Date(Date.now() + 10 * 60_000) },
    });
    await page.context().addCookies([{
      name: "authjs.session-token",
      value: sessionToken,
      url: testInfo.project.use.baseURL ?? "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    }]);
    await db.rankDefinition.createMany({
      data: [
        { id: rankId, rootUnitId: rootId, name: rankName, abbreviation: "PVT", imageRef: "/file.svg", sortOrder: -100000 },
        { id: legacyRankId, rootUnitId: rootId, name: `Long legacy rank without an image ${fixtureId}`, sortOrder: -99999 },
      ],
    });
    await page.goto(`/units/${rootId}/manage#structure`);
    const ranks = page.getByRole("region", { name: "Rank Structure", exact: true });
    const row = ranks.locator("details").filter({ has: page.locator(`input[name="rankId"][value="${rankId}"]`) });

    for (const width of [390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(ranks.getByRole("list", { name: "Ranks", exact: true })).toBeVisible();
      const summary = row.locator(":scope > summary");
      await expect(summary).toContainText("PVT");
      await expect(summary.locator("img")).toHaveAttribute("src", "/file.svg");
      const alignment = await ranks.evaluate((element) => {
        const head = element.querySelector(".units-rank-head")!;
        const firstRow = element.querySelector(".units-rank-row > summary")!;
        return {
          columns: Array.from(firstRow.children).slice(0, 4).map((child, index) =>
            Math.abs(child.getBoundingClientRect().left - head.children[index].getBoundingClientRect().left)),
          action: firstRow.lastElementChild!.getBoundingClientRect().top,
          top: firstRow.getBoundingClientRect().top,
          bottom: firstRow.getBoundingClientRect().bottom,
        };
      });
      for (const offset of alignment.columns) expect(offset).toBeLessThan(1);
      expect(alignment.action).toBeGreaterThanOrEqual(alignment.top);
      expect(alignment.action).toBeLessThan(alignment.bottom);
      await summary.focus();
      await summary.press("Enter");
      const editor = row.getByRole("textbox", { name: "Rank name", exact: true });
      await expect(editor).toBeVisible();
      const sizes = await row.evaluate((element) => ({
        row: element.getBoundingClientRect().width,
        form: element.querySelector("form")!.getBoundingClientRect().width,
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      expect(sizes.form).toBeGreaterThan(sizes.row * .8);
      expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
      await page.screenshot({ path: testInfo.outputPath(`ranks-expanded-${width}.png`), fullPage: true });
      await summary.press("Enter");
      await ranks.screenshot({ path: testInfo.outputPath(`ranks-${width}.png`) });

      const add = ranks.locator("details.units-add");
      await add.locator(":scope > summary").click();
      const formWidth = await add.locator("form").evaluate((element) => element.getBoundingClientRect().width);
      const sectionWidth = await ranks.evaluate((element) => element.getBoundingClientRect().width);
      expect(formWidth).toBeGreaterThan(sectionWidth * .8);
      await add.locator(":scope > summary").click();
    }

    await row.locator(":scope > summary").click();
    await row.getByLabel("Rank (short code)", { exact: true }).fill("PTE");
    await row.getByLabel("Image reference", { exact: true }).fill("/globe.svg");
    await row.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Rank saved.");
    await expect(row.locator(":scope > summary")).toContainText("PTE");
    await expect(row.locator(":scope > summary img")).toHaveAttribute("src", "/globe.svg");
    const saved = await db.rankDefinition.findUniqueOrThrow({ where: { id: rankId } });
    expect(saved.abbreviation).toBe("PTE");
    expect(saved.imageRef).toBe("/globe.svg");
  } finally {
    try {
      await db.$transaction([
        db.rankDefinition.deleteMany({ where: { id: { in: [rankId, legacyRankId] } } }),
        db.session.deleteMany({ where: { sessionToken } }),
      ]);
    } finally {
      await db.$disconnect();
    }
  }
});
