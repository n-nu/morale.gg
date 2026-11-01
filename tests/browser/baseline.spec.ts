import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { readFileSync } from "node:fs";

async function signIn(page: Page, userId: string) {
  await page.goto("/dev/sign-in");
  const form = page.locator("form").filter({ has: page.locator(`input[value="${userId}"]`) });
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/units$/);
}

const publicRoutes = ["/", "/units", "/units/demo-unit-french-line-1", "/players",
  "/players/demo-player-001", "/events", "/events/demo-event-main-review", "/statistics"];
const managerRoutes = ["/units/demo-unit-french-army/manage", "/events/demo-event-main-review/manage",
  "/events/create", "/audits"];

test.describe("M1 development baseline", () => {
  test.skip(process.env.QA_PRODUCTION === "true", "Run against next dev with the QA demo database");

  for (const width of [390, 768, 1440]) {
    test(`public and manager routes at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [role, routes] of [["public", publicRoutes], ["manager", managerRoutes]] as const) {
        if (role === "manager") await signIn(page, "demo-user-root-commander");
        for (const route of routes) {
          const response = await page.goto(route);
          expect.soft(response?.status(), `${role} ${route}: HTTP`).toBe(200);
          await expect(page.locator("h1").first()).toBeVisible();
          const dimensions = await page.evaluate(() => ({
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
          }));
          expect.soft(dimensions.document, `${role} ${route}: horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
          await page.screenshot({ path: testInfo.outputPath(`${role}-${route.replaceAll("/", "_") || "home"}.png`), fullPage: true });
        }
      }
      expect.soft(errors, "browser runtime errors").toEqual([]);
    });
  }

  test("demo sign-in creates an ordinary session, rotates it, and preserves limited authority", async ({ page, context }) => {
    const databaseUrl = process.env.DATABASE_URL;
    expect(databaseUrl, "Use the isolated QA database").toBeTruthy();
    const database = new Client({ connectionString: databaseUrl });
    await database.connect();
    try {
      const before = await database.query('SELECT count(*)::int AS count FROM "PermissionGrant"');
      await signIn(page, "demo-user-root-commander");
      const firstCookie = (await context.cookies()).find((cookie) => cookie.name === "authjs.session-token");
      expect(firstCookie).toBeDefined();
      expect(firstCookie?.httpOnly).toBe(true);
      expect(firstCookie?.sameSite).toBe("Lax");
      const session = await page.request.get("/api/auth/session");
      expect((await session.json()).user.name).toBe("Demo Root Commander");
      const stored = await database.query('SELECT "userId" FROM "Session" WHERE "sessionToken" = $1', [firstCookie?.value]);
      expect(stored.rows[0].userId).toBe("demo-user-root-commander");

      await signIn(page, "demo-user-limited");
      const limitedCookie = (await context.cookies()).find((cookie) => cookie.name === "authjs.session-token");
      const limitedSession = await database.query('SELECT "userId" FROM "Session" WHERE "sessionToken" = $1', [limitedCookie?.value]);
      expect(limitedSession.rows[0].userId).toBe("demo-user-limited");
      expect((await (await page.request.get("/api/auth/session")).json()).user).toBeTruthy();
      expect((await database.query('SELECT 1 FROM "Session" WHERE "sessionToken" = $1', [firstCookie?.value])).rowCount).toBe(0);
      const denied = await page.goto("/units/demo-unit-french-army/manage");
      expect(denied?.status()).toBe(404);
      await expect(page.locator('input[name="name"]')).toHaveCount(0);
      const after = await database.query('SELECT count(*)::int AS count FROM "PermissionGrant"');
      expect(after.rows).toEqual(before.rows);
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect.poll(async () => (await (await page.request.get("/api/auth/session")).json())).toBeNull();
    } finally {
      await database.end();
    }
  });
});

test("production hides demo sign-in even with explicit enablement", async ({ page, context }) => {
  test.skip(process.env.QA_PRODUCTION !== "true", "Run against next start with DEV_SIGN_IN_ENABLED=true");
  const response = await page.goto("/dev/sign-in");
  expect(response?.status()).toBe(404);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Demo sign-in" })).toHaveCount(0);
  expect((await context.cookies()).some((cookie) => cookie.name === "authjs.session-token")).toBe(false);
  expect((await page.goto("/dev/auth-diagnostic"))?.status()).toBe(404);
});

test("production rejects a direct demo action POST without creating a session", async ({ page, context }) => {
  test.skip(process.env.QA_PRODUCTION !== "true", "Requires the local production build and QA database");
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const actionId = Object.entries(manifest.node).find(([, action]) => action.exportedName === "devSignInAction")?.[0];
  expect(actionId, "Find the real action in this build, not a stale action ID").toBeTruthy();
  const database = new Client({ connectionString: process.env.DATABASE_URL });
  await database.connect();
  try {
    const before = await database.query('SELECT count(*)::int AS count FROM "Session"');
    await page.goto("/");
    const response = await page.request.post("/dev/sign-in", {
      headers: { origin: new URL(page.url()).origin },
      multipart: { [`$ACTION_ID_${actionId}`]: "", userId: "demo-user-root-commander" },
    });
    expect(response.status()).toBe(500);
    expect(response.headers()["set-cookie"] ?? "").not.toContain("authjs.session-token=");
    expect((await context.cookies()).some((cookie) => cookie.name === "authjs.session-token")).toBe(false);
    expect((await database.query('SELECT count(*)::int AS count FROM "Session"')).rows).toEqual(before.rows);
  } finally {
    await database.end();
  }
});
