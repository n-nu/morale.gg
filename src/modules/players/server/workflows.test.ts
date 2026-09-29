import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { playerWorkflows } from "./workflows";
import { findPlayerByGameId, getCurrentRoster, getPlayer, getPlayerMemberships, listPlayers } from "./queries";
import { validatePlayer } from "../validation";

test("validates opaque stable identity and display name", () => {
  assert.deepEqual(validatePlayer({ playerId: " 00123 ", name: " Player " }), { playerId: "00123", name: "Player" });
  for (const playerId of [null, "", "a b", "a\nb", "x".repeat(129)]) {
    assert.throws(() => validatePlayer({ playerId, name: "Player" }));
  }
  for (const name of [null, " ", "x".repeat(101), "a\u0000b"]) {
    assert.throws(() => validatePlayer({ playerId: "123", name }));
  }
});

test("Player workflows preserve history with real PostgreSQL constraints", async (t) => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required; persistence verification must not silently skip");
  const schema = `players_test_${randomUUID().replaceAll("-", "")}`;
  const client = new Client({ connectionString });
  await client.connect();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
  let signedIn: string | null = "session-user";
  let allowed = true;
  const decisions: Array<[string, string]> = [];
  const workflow = playerWorkflows({
    db,
    getUserId: async () => signedIn,
    authorize: async (userId, unitId) => {
      decisions.push([userId, unitId]);
      return allowed;
    },
  });
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    // Only Unit identity is needed by this consumer; authority belongs to the producer tests.
    await client.query('CREATE TABLE "Unit" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)');
    await client.query('INSERT INTO "Unit" VALUES ($1, $2), ($3, $4), ($5, $6)', ["unit-a", "Unit A", "unit-b", "Unit B", "unit-identity", "Identity Fixture Unit"]);
    await client.query(await readFile(new URL("../../../../prisma/migrations/20260925120000_players_memberships/migration.sql", import.meta.url), "utf8"));

    await t.test("register, locate and safely reject duplicate stable identity", async () => {
      const player = await workflow.registerPlayer({ playerId: "00123", name: "Player One" });
      assert.notEqual(player.id, player.playerId);
      assert.equal((await findPlayerByGameId(" 00123 ", db))?.id, player.id);
      assert.equal((await getPlayer(player.id, db))?.name, "Player One");
      assert.equal((await listPlayers("One", db)).length, 1);
      await assert.rejects(workflow.registerPlayer({ playerId: "00123", name: "Duplicate" }), /already registered/);
      assert.equal(await db.player.count(), 1);
    });

    await t.test("public Player identity stays separate from roster foreign keys", async () => {
      const fixture = await db.player.create({
        data: { id: "player-row-uuid-123", playerId: "demo-player-001", name: "Identity Player" },
      });
      assert.notEqual(fixture.id, fixture.playerId);
      assert.equal((await findPlayerByGameId("demo-player-001", db))?.id, "player-row-uuid-123");
      assert.equal(await findPlayerByGameId("player-row-uuid-123", db), null);
      assert.deepEqual(await listPlayers("demo-player-001", db), [{ playerId: "demo-player-001", name: "Identity Player" }]);

      const membership = await workflow.addMembership({ playerId: fixture.id, unitId: "unit-identity" });
      const persistedMembership = await db.unitMembership.findUnique({
        where: { id: membership.id },
        select: { playerId: true },
      });
      assert.equal(persistedMembership?.playerId, "player-row-uuid-123");

      const roster = await getCurrentRoster("unit-identity", db);
      assert.equal(roster.length, 1);
      assert.equal(roster[0].membershipId, membership.id);
      assert.deepEqual(roster[0].player, { playerId: "demo-player-001", name: "Identity Player" });
      assert.equal("id" in roster[0].player, false);
      await db.unitMembership.delete({ where: { id: membership.id } });
      await db.player.delete({ where: { id: fixture.id } });
    });

    const player = (await findPlayerByGameId("00123", db))!;
    let firstMembershipId = "";
    await t.test("add concurrently, reject duplicate active pair, allow multiple Units", async () => {
      const attempts = await Promise.allSettled([
        workflow.addMembership({ playerId: player.id, unitId: "unit-a" }),
        workflow.addMembership({ playerId: player.id, unitId: "unit-a" }),
      ]);
      assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
      const rejected = attempts.find((attempt) => attempt.status === "rejected");
      assert.match(String(rejected?.reason), /already on the current roster/);
      await workflow.addMembership({ playerId: player.id, unitId: "unit-b" });
      const roster = await getCurrentRoster("unit-a", db);
      assert.equal(roster.length, 1);
      firstMembershipId = roster[0].membershipId;
      assert.equal((await getCurrentRoster("unit-b", db)).length, 1);
      assert.deepEqual(decisions.at(-1), ["session-user", "unit-b"]);
      await assert.rejects(db.unitMembership.create({ data: { playerId: player.id, unitId: "unit-a" } }), { code: "P2002" });
    });

    await t.test("deny unauthenticated and unauthorized writes without side effects", async () => {
      signedIn = null;
      await assert.rejects(workflow.registerPlayer({ playerId: "denied", name: "Denied" }), /Sign in/);
      await assert.rejects(workflow.addMembership({ playerId: player.id, unitId: "unit-a" }), /Sign in/);
      await assert.rejects(workflow.endMembership({ membershipId: firstMembershipId, unitId: "unit-a" }), /Sign in/);
      signedIn = "session-user";
      allowed = false;
      await assert.rejects(workflow.addMembership({ playerId: player.id, unitId: "unit-a" }), /permission/);
      await assert.rejects(workflow.endMembership({ membershipId: firstMembershipId, unitId: "unit-a" }), /permission/);
      assert.equal((await getCurrentRoster("unit-a", db)).length, 1);
      assert.equal(await db.player.count(), 1);
      allowed = true;
    });

    await t.test("missing targets and mismatched membership Unit fail safely", async () => {
      await assert.rejects(workflow.addMembership({ playerId: "missing", unitId: "unit-a" }), /Player not found/);
      await assert.rejects(workflow.addMembership({ playerId: player.id, unitId: "missing" }), /Unit not found/);
      await assert.rejects(workflow.endMembership({ membershipId: "missing", unitId: "unit-a" }), /Membership not found/);
      await assert.rejects(workflow.endMembership({ membershipId: firstMembershipId, unitId: "unit-b" }), /Membership not found/);
      assert.equal(await db.unitMembership.count(), 2);
    });

    await t.test("end once, keep history and Player, rejoin as a new period", async () => {
      const attempts = await Promise.allSettled([
        workflow.endMembership({ membershipId: firstMembershipId, unitId: "unit-a" }),
        workflow.endMembership({ membershipId: firstMembershipId, unitId: "unit-a" }),
      ]);
      assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
      assert.equal((await getCurrentRoster("unit-a", db)).length, 0);
      assert.equal((await getCurrentRoster("unit-b", db)).length, 1);
      assert.ok(await getPlayer(player.id, db));
      const history = await getPlayerMemberships(player.id, db);
      assert.equal(history.length, 2);
      assert.ok(history.find((entry) => entry.id === firstMembershipId)?.endedAt);
      const rejoined = await workflow.addMembership({ playerId: player.id, unitId: "unit-a" });
      assert.notEqual(rejoined.id, firstMembershipId);
      assert.equal((await getCurrentRoster("unit-a", db))[0].membershipId, rejoined.id);
      assert.equal((await getPlayerMemberships(player.id, db)).length, 3);
    });

    await t.test("foreign keys preserve history and invalid periods are rejected", async () => {
      await assert.rejects(db.player.delete({ where: { id: player.id } }), { code: "P2003" });
      await assert.rejects(client.query('DELETE FROM "Unit" WHERE "id" = $1', ["unit-a"]), { code: "23503" });
      await assert.rejects(client.query('UPDATE "UnitMembership" SET "endedAt" = "startedAt" - INTERVAL \'1 second\' WHERE "id" = $1', [firstMembershipId]), { code: "23514" });
    });
  } finally {
    await db.$disconnect();
    // Generated test-owned schema only. No application data is touched.
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
