import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const playerId = process.env.AWARD_BROWSER_PLAYER_ID ?? "demo-player-001";
let fixtureAwardId: string | null = null;

test.beforeEach(async () => {
  if (process.env.QA_PRODUCTION === "true") return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must target the browser server's local test database.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const existingGrant = await db.playerAwardGrant.findFirst({
      where: { playerId },
      select: { award: { select: { rootUnitId: true } } },
    });
    if (!existingGrant) {
      throw new Error(`Player ${playerId} needs one existing Player Award grant for this browser check.`);
    }

    fixtureAwardId = `award-medal-browser-${randomUUID()}`;
    await db.awardDefinition.create({
      data: {
        id: fixtureAwardId,
        rootUnitId: existingGrant.award.rootUnitId,
        category: "PLAYER",
        name: `Browser Medal Fixture ${fixtureAwardId}`,
        description: "Temporary award used to verify medal spacing.",
        imageRef: "/file.svg",
        sortOrder: 1_000_000,
      },
    });
    await db.playerAwardGrant.create({ data: { awardId: fixtureAwardId, playerId } });
  } finally {
    await db.$disconnect();
  }
});

test.afterEach(async () => {
  if (!fixtureAwardId) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must target the browser server's local test database.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await db.playerAwardGrant.deleteMany({ where: { awardId: fixtureAwardId } });
    await db.awardDefinition.delete({ where: { id: fixtureAwardId } });
  } finally {
    await db.$disconnect();
    fixtureAwardId = null;
  }
});

test("Player medals gain restrained depth without changing the gallery interaction", async ({ page, browser }) => {
  test.skip(process.env.QA_PRODUCTION === "true", "Uses a temporary Player Award fixture in the isolated QA database.");
  await page.goto(`/players/${encodeURIComponent(playerId)}`);

  const medals = page.getByRole("button", { name: /medal details/ });
  expect(await medals.count()).toBeGreaterThanOrEqual(2);
  const medal = medals.first();
  const adjacentMedal = medals.nth(1);
  const medalSlots = page.getByRole("list", { name: "Player medals" }).locator(":scope > li");
  const frontFace = medal.locator(".player-award-medal__face");

  for (const width of [390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.locator("html").evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(dimensions.scroll, `Player profile overflow at ${width}px`)
      .toBeLessThanOrEqual(dimensions.client + 1);
  }

  await expect(medal).toHaveAttribute("aria-expanded", "false");
  await expect(medal).toHaveAttribute("data-dimensional", "false");
  await expect(medal).toHaveAttribute("data-clicking", "false");
  await expect(adjacentMedal).toHaveAttribute("data-dimensional", "false");
  const idleAnimation = await medal.locator(".player-award-medal__art")
    .evaluate((art) => getComputedStyle(art).animationName);
  expect(idleAnimation).toBe("none");
  const adjacentLeftBefore = await medalSlots.nth(1)
    .evaluate((element) => element.getBoundingClientRect().left);
  const frontAtRest = await frontFace.evaluate((image) => ({
    filter: getComputedStyle(image).filter,
    opacity: getComputedStyle(image).opacity,
    naturalWidth: (image as HTMLImageElement).naturalWidth,
    naturalHeight: (image as HTMLImageElement).naturalHeight,
  }));
  expect(frontAtRest.filter).toBe("none");
  expect(frontAtRest.opacity).toBe("1");
  expect(frontAtRest.naturalWidth).toBeGreaterThanOrEqual(96);

  await medal.hover();
  await page.waitForTimeout(550);
  const bounds = await medal.boundingBox();
  if (!bounds) throw new Error("The first Player medal has no visible bounds.");
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  await page.mouse.move(centerX - 20, centerY - 15);
  await page.mouse.move(centerX + 20, centerY + 15);
  const afterPointerMove = await medal.evaluate((button) => ({
    clicking: button.hasAttribute("data-clicking") && button.dataset.clicking === "true",
    animation: getComputedStyle(button.querySelector(".player-award-medal__art")!).animationName,
    rotateX: button.style.getPropertyValue("--medal-rotate-x"),
    rotateY: button.style.getPropertyValue("--medal-rotate-y"),
    images: button.querySelectorAll(".player-award-medal__art img").length,
    frontFilter: getComputedStyle(button.querySelector(".player-award-medal__face")!).filter,
    frontOpacity: getComputedStyle(button.querySelector(".player-award-medal__face")!).opacity,
    frontWidth: (button.querySelector(".player-award-medal__face") as HTMLImageElement).naturalWidth,
  }));
  expect(afterPointerMove.clicking).toBe(false);
  expect(afterPointerMove.animation).toBe("player-award-medal-drift");
  expect(afterPointerMove.rotateX).toBe("");
  expect(afterPointerMove.rotateY).toBe("");
  expect(afterPointerMove.frontFilter).toBe("none");
  expect(afterPointerMove.frontOpacity).toBe("1");
  expect(afterPointerMove.frontWidth).toBe(frontAtRest.naturalWidth);
  expect(afterPointerMove.images).toBe(5);
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await expect(medal).toHaveAttribute("data-pressed", "true");
  await expect(medal.locator(".player-award-medal__art"))
    .toHaveCSS("animation-play-state", "paused");
  await page.mouse.move(centerX + 80, centerY + 60);
  await expect(medal).toHaveAttribute("data-dragging", "true");
  expect(await medal.evaluate((button) => [
    button.style.getPropertyValue("--medal-drag-x"),
    button.style.getPropertyValue("--medal-drag-y"),
  ])).toEqual(["-12deg", "15deg"]);
  await page.mouse.move(centerX - 80, centerY - 60);
  expect(await medal.evaluate((button) => [
    button.style.getPropertyValue("--medal-drag-x"),
    button.style.getPropertyValue("--medal-drag-y"),
  ])).toEqual(["12deg", "-15deg"]);
  await page.mouse.up();
  await expect(medal).toHaveAttribute("data-pressed", "false");
  await expect(medal).toHaveAttribute("data-dragging", "false");
  await expect(medal).toHaveAttribute("data-settling", "true");
  await expect(medal).toHaveAttribute("data-clicking", "false");
  await expect(medal).toHaveAttribute("data-settling", "false");
  await expect(medal.locator(".player-award-medal__art"))
    .toHaveCSS("animation-name", "none");
  await page.mouse.move(0, 0);
  await expect(medal).toHaveAttribute("aria-expanded", "false");

  await expect(adjacentMedal).toHaveAttribute("data-dimensional", "false");
  await medal.click();
  await expect(medal).toHaveAttribute("aria-expanded", "true");
  await expect(medal).toHaveAttribute("data-clicking", "true");
  await expect(medal).toHaveAttribute("data-dimensional", "true");
  await expect(medal.locator(".player-award-medal__art"))
    .toHaveCSS("animation-name", "player-award-medal-click");
  await expect(medal).toHaveAttribute("data-clicking", "false", { timeout: 2_000 });
  await expect(medal.locator(".player-award-medal__art"))
    .toHaveCSS("animation-name", "player-award-medal-drift");

  await page.waitForTimeout(550);
  const adjacentLeftAfter = await medalSlots.nth(1)
    .evaluate((element) => element.getBoundingClientRect().left);
  expect(adjacentLeftAfter - adjacentLeftBefore).toBeGreaterThan(20);

  await medal.click();
  await page.mouse.move(0, 0);
  await expect(medal).toBeFocused();
  await expect(medal).toHaveAttribute("aria-expanded", "false");
  await expect(medal).toHaveAttribute("data-dimensional", "false");
  await expect(medal.locator(".player-award-medal__art")).toHaveCSS("animation-name", "none");
  await expect(medal.locator(".player-award-medal__art")).toHaveCSS("transform", "none");
  await page.waitForTimeout(1000);
  await expect(medal).toHaveAttribute("aria-expanded", "false");
  await medal.hover();
  await expect(medal.locator(".player-award-medal__art"))
    .toHaveCSS("animation-name", "player-award-medal-drift");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(medal).toBeFocused();
  await expect(medal).toHaveAttribute("data-dimensional", "true");
  await medal.press("Enter");
  await expect(medal.locator(".player-award-medal__art")).toHaveCSS("animation-name", "none");
  await expect(medal).toHaveAttribute("aria-expanded", "true");
  await expect(medal).toHaveAttribute("data-clicking", "false", { timeout: 2_000 });
  await medal.press("Enter");
  await medal.evaluate((button) => button.blur());
  await expect(medal).toHaveAttribute("aria-expanded", "false");

  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await medal.hover();
  const reducedMotion = await medal.evaluate((button) => {
    const art = button.querySelector(".player-award-medal__art");
    const depth = button.querySelector(".player-award-medal__depth");
    return {
      transform: getComputedStyle(art!).transform,
      animation: getComputedStyle(art!).animationName,
      transition: getComputedStyle(art!).transitionDuration,
      depthOpacity: getComputedStyle(depth!).opacity,
    };
  });
  expect(reducedMotion.transform).toBe("none");
  expect(reducedMotion.animation).toBe("none");
  expect(reducedMotion.transition).toBe("0s");
  expect(reducedMotion.depthOpacity).toBe("0");
  await medal.click();
  await expect(medal).toHaveAttribute("data-clicking", "false");
  await expect(medal.locator(".player-award-medal__art")).toHaveCSS("animation-name", "none");
  await medal.hover();
  await page.mouse.down();
  await page.mouse.move(centerX + 30, centerY + 20);
  await expect(medal).toHaveAttribute("data-dragging", "false");
  await expect(medal.locator(".player-award-medal__art")).toHaveCSS("transform", "none");
  await page.mouse.up();

  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto(new URL(`/players/${encodeURIComponent(playerId)}`, page.url()).toString());
    const touchMedal = touchPage.getByRole("button", { name: /medal details/ }).first();
    const touchMedalName = (await touchMedal.getAttribute("aria-label"))?.replace(/ medal details$/, "");
    if (!touchMedalName) throw new Error("The first touch Player medal has no accessible name.");
    const touchBounds = await touchMedal.boundingBox();
    if (!touchBounds) throw new Error("The first touch Player medal has no visible bounds.");
    await touchPage.touchscreen.tap(
      touchBounds.x + touchBounds.width / 2,
      touchBounds.y + touchBounds.height / 2,
    );
    await expect(touchMedal).toHaveAttribute("aria-expanded", "true");
    await expect(touchMedal).toHaveAttribute("data-clicking", "false");
    await expect(touchMedal.locator(".player-award-medal__art"))
      .toHaveCSS("animation-name", "none");
    await expect(touchPage.getByRole("heading", { name: touchMedalName })).toBeVisible();
  } finally {
    await touchContext.close();
  }
});
