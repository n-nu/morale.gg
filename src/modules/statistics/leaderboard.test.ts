import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getLeaderboard } from "./leaderboard";
import type { LeaderboardData, LeaderboardRow } from "./leaderboard-model";
import { getDirectUnitPerformance, getDirectUnitPerformanceForAllUnits } from "./unit";

const NOW = new Date("2026-10-31T00:00:00.000Z");

const originalEventFindMany = prisma.event.findMany;
const originalAuditFindMany = prisma.audit.findMany;
const originalGroupFindMany = prisma.eventCommandGroup.findMany;
const originalQueryRaw = prisma.$queryRaw;

test.afterEach(() => {
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: originalEventFindMany });
  Object.defineProperty(prisma.audit, "findMany", { configurable: true, value: originalAuditFindMany });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: originalGroupFindMany });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: originalQueryRaw });
});

function audit(
  id: string,
  eventId: string,
  unitId: string,
  unitName: string,
  unitType: string,
  results: Array<{ playerId: string; name: string | null; kills: number; deaths: number; assists: number }>,
  commander: string | null,
) {
  return {
    id: `audit-${id}`,
    atomicEventUnitId: `atomic-${id}`,
    unitType,
    tickets: 50,
    flagCaptures: 1,
    flagLosses: 0,
    stars: 2,
    atomicEventUnit: {
      id: `atomic-${id}`,
      name: null,
      side: "ATTACKER",
      isMandatory: true,
      eventParticipation: { id: `participation-${id}`, eventId, unitId, unit: { name: unitName } },
    },
    playerResults: results.map(({ playerId, name, kills, deaths, assists }) => ({ kills, deaths, assists, player: { playerId, name } })),
    roles: commander ? [{ role: "COMMANDER", player: { playerId: commander } }] : [],
  };
}

const AUDITS = [
  audit("r1", "recent", "unit-a", "42nd Highland", "REGULAR", [
    { playerId: "p-named", name: "  Ney  ", kills: 10, deaths: 2, assists: 4 },
    { playerId: "p-anon", name: null, kills: 3, deaths: 0, assists: 1 },
  ], "p-named"),
  audit("r2", "recent", "unit-b", "95th Rifles", "RIFLES", [
    { playerId: "p-anon", name: "   ", kills: 5, deaths: 5, assists: 0 },
  ], "p-anon"),
  audit("o1", "old", "unit-a", "42nd Highland", "REGULAR", [
    { playerId: "p-named", name: "Ney", kills: 20, deaths: 1, assists: 0 },
  ], null),
];

function rankerRows(eventIds: string[]) {
  const recent = eventIds.includes("recent");
  const old = eventIds.includes("old");
  const rows: Array<Record<string, unknown>> = [];
  if (recent || old) {
    rows.push({
      gamePlayerId: "p-named", unitType: "REGULAR",
      kills: BigInt((recent ? 10 : 0) + (old ? 20 : 0)),
      deaths: BigInt((recent ? 2 : 0) + (old ? 1 : 0)),
      assists: BigInt(recent ? 4 : 0),
      auditAppearances: BigInt((recent ? 1 : 0) + (old ? 1 : 0)),
      distinctEvents: BigInt((recent ? 1 : 0) + (old ? 1 : 0)),
    });
  }
  if (recent) {
    rows.push({ gamePlayerId: "p-anon", unitType: "REGULAR", kills: BigInt(3), deaths: BigInt(0), assists: BigInt(1), auditAppearances: BigInt(1), distinctEvents: BigInt(1) });
    rows.push({ gamePlayerId: "p-anon", unitType: "RIFLES", kills: BigInt(5), deaths: BigInt(5), assists: BigInt(0), auditAppearances: BigInt(1), distinctEvents: BigInt(1) });
  }
  return rows;
}

function installSource({ withEvents = true } = {}) {
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () => withEvents
      ? [
          { id: "old", scheduledAt: new Date("2026-09-01T00:00:00.000Z") },
          { id: "recent", scheduledAt: new Date("2026-10-30T00:00:00.000Z") },
        ]
      : [],
  });
  Object.defineProperty(prisma.audit, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { atomicEventUnit: { eventParticipation: { eventId: { in: string[] } } } } }) => {
      const eventIds = where.atomicEventUnit.eventParticipation.eventId.in;
      return AUDITS.filter((entry) => eventIds.includes(entry.atomicEventUnit.eventParticipation.eventId));
    },
  });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { eventId: { in: string[] } } }) => where.eventId.in.includes("recent")
      ? [{
          id: "group-1",
          eventId: "recent",
          parentGroupId: null,
          eventParticipation: { unitId: "unit-a" },
          commanderPlayer: { playerId: "p-named" },
          atomicUnitMemberships: [{ atomicEventUnitId: "atomic-r1" }, { atomicEventUnitId: "atomic-r2" }],
        }]
      : [],
  });
  Object.defineProperty(prisma, "$queryRaw", {
    configurable: true,
    value: async (query: { values?: unknown[] }) => rankerRows((query.values ?? []).filter((value): value is string => typeof value === "string")),
  });
}

function partition(data: LeaderboardData, unitType: string | null): LeaderboardRow[] {
  return data.partitions.find((entry) => entry.unitType === unitType)?.rows ?? [];
}

function playerRow(rows: LeaderboardRow[], gamePlayerId: string): LeaderboardRow {
  const row = rows.find((entry) => entry.subject.kind === "player" && entry.subject.gamePlayerId === gamePlayerId);
  assert.ok(row, `expected a row for ${gamePlayerId}`);
  return row;
}

test("Players board is branch-partitioned, windowed, and uses the public-name fallback", async () => {
  installSource();
  const recent = await getLeaderboard("players", "14d", NOW);

  assert.deepEqual(recent.partitions.map(({ unitType }) => unitType), ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"]);
  const regular = partition(recent, "REGULAR");
  assert.equal(regular.length, 2);
  assert.deepEqual(playerRow(regular, "p-named").subject, { kind: "player", gamePlayerId: "p-named", displayName: "Ney" });
  assert.deepEqual(playerRow(regular, "p-anon").subject, { kind: "player", gamePlayerId: "p-anon", displayName: "p-anon" }, "blank or missing names fall back to the game Player ID");

  const named = playerRow(regular, "p-named").metrics;
  assert.deepEqual(named.kills, { kind: "count", value: 10 });
  assert.deepEqual(named.audits, { kind: "count", value: 1 });
  assert.equal(named.kd.kind === "ratio" && named.kd.ratio.display, "5");

  const anonymous = playerRow(regular, "p-anon").metrics;
  assert.equal(anonymous.kd.kind === "ratio" && anonymous.kd.ratio.state, "ZERO_DENOMINATOR");
  assert.equal(anonymous.kd.kind === "ratio" && anonymous.kd.ratio.display, "3 K");
  assert.equal(anonymous.kad.kind === "ratio" && anonymous.kad.ratio.display, "4 K+A");
  assert.equal(partition(recent, "RIFLES").length, 1, "a player in two branches appears once per branch, never merged");

  const allTime = await getLeaderboard("players", "all-time", NOW);
  const pooled = playerRow(partition(allTime, "REGULAR"), "p-named").metrics;
  assert.deepEqual(pooled.kills, { kind: "count", value: 30 });
  assert.equal(pooled.kd.kind === "ratio" && pooled.kd.ratio.display, "10", "ratios pool raw totals (30 ÷ 3), not per-window ratios");
  assert.deepEqual(pooled.killsPerAudit, { kind: "average", value: 15 });
});

test("Commander, General, and Unit boards reuse their readers' semantics", async () => {
  installSource();
  const commanders = await getLeaderboard("commanders", "14d", NOW);
  const commander = playerRow(partition(commanders, "REGULAR"), "p-named").metrics;
  assert.deepEqual(commander.battles, { kind: "count", value: 1 });
  assert.equal(commander.kd.kind === "ratio" && commander.kd.ratio.display, "6.5", "Unit K/D pools the whole commanded unit (13 ÷ 2)");
  assert.deepEqual(commander.averagePlayers, { kind: "average", value: 2 });
  assert.equal(playerRow(partition(commanders, "RIFLES"), "p-anon").subject.kind, "player");

  const generals = await getLeaderboard("generals", "14d", NOW);
  assert.deepEqual(generals.partitions.map(({ unitType }) => unitType), [null]);
  const general = playerRow(partition(generals, null), "p-named").metrics;
  assert.deepEqual(general.commands, { kind: "count", value: 1 });
  assert.deepEqual(general.atomicUnits, { kind: "count", value: 2 });
  assert.deepEqual(general.regular, { kind: "count", value: 1 });
  assert.deepEqual(general.rifles, { kind: "count", value: 1 });

  const units = await getLeaderboard("units", "all-time", NOW);
  const highland = partition(units, "REGULAR")[0];
  assert.deepEqual(highland.subject, { kind: "unit", unitId: "unit-a", unitName: "42nd Highland" });
  assert.deepEqual(highland.metrics.audits, { kind: "count", value: 2 });
  assert.deepEqual(highland.metrics.kills, { kind: "count", value: 33 });
  assert.equal(highland.metrics.kd.kind === "ratio" && highland.metrics.kd.ratio.display, "11");
  const recentUnits = await getLeaderboard("units", "14d", NOW);
  assert.deepEqual(partition(recentUnits, "REGULAR")[0].metrics.audits, { kind: "count", value: 1 }, "the window excludes the old Audit");
});

test("the all-Units reader returns exactly the per-Unit Direct Performance for every Unit", async () => {
  installSource();
  for (const window of ["14d", "all-time"] as const) {
    const all = await getDirectUnitPerformanceForAllUnits(window, NOW);
    assert.deepEqual(all.units.map(({ unitId }) => unitId), ["unit-a", "unit-b"]);
    for (const unit of all.units) {
      const single = await getDirectUnitPerformance(unit.unitId, window, NOW);
      assert.deepEqual(unit.unitTypes, single.unitTypes, `${unit.unitId} ${window}`);
    }
  }
});

test("Leaderboard DTOs carry only public identity, never internal record IDs", async () => {
  installSource();
  for (const board of ["players", "commanders", "generals", "units"] as const) {
    const serialized = JSON.stringify(await getLeaderboard(board, "all-time", NOW));
    assert.doesNotMatch(serialized, /audit-|atomic-|participation-|group-|"recent"|"old"/, board);
  }
  const players = await getLeaderboard("players", "all-time", NOW);
  for (const row of players.partitions.flatMap(({ rows }) => rows)) {
    assert.deepEqual(Object.keys(row.subject).sort(), ["displayName", "gamePlayerId", "kind"]);
  }
});

test("an empty window yields empty partitions for every board", async () => {
  installSource({ withEvents: false });
  for (const board of ["players", "commanders", "generals", "units"] as const) {
    const data = await getLeaderboard(board, "14d", NOW);
    assert.ok(data.partitions.length > 0, board);
    assert.ok(data.partitions.every(({ rows }) => rows.length === 0), board);
  }
});
