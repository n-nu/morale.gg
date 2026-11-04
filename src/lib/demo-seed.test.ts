import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  assertSafeDatabaseTarget,
  DEMO_RESET_CONFIRMATION_FLAG,
  demoMercenaryIdentity,
  demoPlayerIdentity,
  isDemoResetConfirmed,
  requireSingleRootUnit,
} from "../../prisma/demo-reset";
import { demoUnitId, ROBLOX_PLAYER_FIXTURES, ROBLOX_UNIT_FIXTURES } from "../../prisma/fixtures/roblox-community";

test("demo Player identities are deterministic and distinct from internal row IDs", () => {
  assert.deepEqual(demoPlayerIdentity(0), { id: "player-row-uuid-123", playerId: "demo-player-001" });
  const players = Array.from({ length: 120 }, (_, index) => demoPlayerIdentity(index));
  assert.equal(new Set(players.map(({ playerId }) => playerId)).size, players.length);
  assert.ok(players.every(({ id, playerId }) => id !== playerId));
  assert.deepEqual(demoMercenaryIdentity(0), { id: "player-row-merc-001", playerId: "demo-player-merc-001" });
  assert.notEqual(demoMercenaryIdentity(0).id, demoMercenaryIdentity(0).playerId);
});

test("demo seeding commands are defined and the demo seed script exists", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

  assert.equal(typeof packageJson.scripts["demo:reset"], "string");
  assert.equal(typeof packageJson.scripts["seed:demo"], "string");
  assert.equal(typeof packageJson.scripts["seed:demo:reset"], "string");
  assert.equal(packageJson.scripts["seed:demo"], "npm run demo:reset");
  assert.equal(packageJson.scripts["seed:demo:reset"], "npm run demo:reset");

  const seedScript = readFileSync(join(process.cwd(), "prisma/seed-demo.ts"), "utf8");
  const resetScript = readFileSync(join(process.cwd(), "prisma/demo-reset.ts"), "utf8");
  assert.match(seedScript, /runDemoReset/);
  assert.match(resetScript, /DEMO_USER_IDS/);
  assert.match(resetScript, /clearResettableData/);
  assert.match(resetScript, /name: null/);
  assert.match(resetScript, /ROSTER_PLAYERS_PER_UNIT/);
  assert.doesNotMatch(resetScript, /playerHandles|playerName\(/);
});

test("database safety accepts only the configured local Compose database", () => {
  assert.equal(isDemoResetConfirmed([DEMO_RESET_CONFIRMATION_FLAG]), true);
  assert.equal(isDemoResetConfirmed([]), false);
  assert.throws(() => isDemoResetConfirmed(["--force"]), /unrecognized.*argument/i);
  assert.deepEqual(
    assertSafeDatabaseTarget({
      DATABASE_URL: "postgresql://demo:secret@localhost:5432/morale_gg?schema=public",
      POSTGRES_DB: "morale_gg",
      POSTGRES_PORT: "5432",
    }, true),
    { environment: "development (NODE_ENV unset)", host: "localhost", databaseName: "morale_gg" },
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ NODE_ENV: "production", DATABASE_URL: "postgresql://localhost/morale_gg" }, true),
    /disabled.*production/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ NODE_ENV: " Production ", DATABASE_URL: "postgresql://localhost/morale_gg" }, true),
    /disabled.*production/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://db.example.com:5432/morale_gg" }, true),
    /not a verified local/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://localhost:5432/production" }, true),
    /does not match.*Compose/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://localhost:5432/morale_gg?host=db.example.com" }, true),
    /connection overrides.*ambiguous/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({
      DATABASE_URL: "postgresql://localhost:5432/morale_gg",
      POSTGRES_DB: "morale_gg",
      POSTGRES_PORT: "5432",
    }, false),
    new RegExp(DEMO_RESET_CONFIRMATION_FLAG),
  );
  assert.throws(
    () => assertSafeDatabaseTarget({}, true),
    /DATABASE_URL is required/i,
  );
});

test("Roblox source fixture has unique, linked organization and profile records", () => {
  assert.equal(ROBLOX_UNIT_FIXTURES.length, 178);
  assert.equal(ROBLOX_PLAYER_FIXTURES.length, 10);
  assert.equal(new Set(ROBLOX_UNIT_FIXTURES.map(({ key }) => key)).size, ROBLOX_UNIT_FIXTURES.length);
  const unitIds = ROBLOX_UNIT_FIXTURES.map(({ key }) => demoUnitId(key));
  assert.equal(new Set(unitIds).size, ROBLOX_UNIT_FIXTURES.length);
  assert.equal(demoUnitId("frenchArmy"), "demo-unit-french-army");
  const linkedGroupIds = ROBLOX_UNIT_FIXTURES.flatMap(({ groupId }) => groupId === null ? [] : [groupId]);
  assert.equal(new Set(linkedGroupIds).size, linkedGroupIds.length);
  assert.equal(new Set(ROBLOX_PLAYER_FIXTURES.map(({ playerId }) => playerId)).size, ROBLOX_PLAYER_FIXTURES.length);
  assert.ok(ROBLOX_PLAYER_FIXTURES.every(({ playerId, robloxUsername, robloxAvatarUrl }) =>
    /^\d+$/.test(playerId) && robloxUsername.length > 0 && robloxAvatarUrl.startsWith("https://tr.rbxcdn.com/")));
  const visited = new Set<string>();
  for (const { key, parentKey, name, groupId, groupUrl, sourceUrl, verifiedOn } of ROBLOX_UNIT_FIXTURES) {
    assert.ok(parentKey === null || visited.has(parentKey), `Parent ${parentKey} must be declared before ${key}.`);
    assert.ok(name.length > 0 && sourceUrl.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(verifiedOn));
    assert.equal(groupId === null, groupUrl === null, `${key} must either provide both group ID and URL or neither.`);
    visited.add(key);
  }
  const profileIds = new Set(ROBLOX_PLAYER_FIXTURES.map(({ playerId }) => playerId));
  assert.ok(ROBLOX_UNIT_FIXTURES.every(({ ownerPlayerId }) => !ownerPlayerId || profileIds.has(ownerPlayerId)));
});

test("root selection refuses zero or multiple RootUnits and identifies candidates", () => {
  assert.deepEqual(requireSingleRootUnit([{ unitId: "root-a", name: "A" }]), { unitId: "root-a", name: "A" });
  assert.throws(() => requireSingleRootUnit([]), /found 0: none/i);
  assert.throws(
    () => requireSingleRootUnit([{ unitId: "root-a", name: "A" }, { unitId: "root-b", name: "B" }]),
    /root-a \(A\).*root-b \(B\)/i,
  );
});
