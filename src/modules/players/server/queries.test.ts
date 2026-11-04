import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  getCurrentRosterCounts,
  getCurrentUnitIdsForPlayer,
  getPlayerIdentityPresentationBatch,
} from "./queries";

test("Player identity presentation batches reads and restores request order", async () => {
  const calls: unknown[] = [];
  const db = {
    player: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [
          { playerId: "player-b", robloxUsername: "B", robloxAvatarUrl: null },
          { playerId: "player-a", robloxUsername: null, robloxAvatarUrl: "https://tr.rbxcdn.com/a.png" },
        ];
      },
    },
  } as unknown as typeof prisma;

  assert.deepEqual(
    await getPlayerIdentityPresentationBatch([" player-a ", "player-b", "player-a", "missing"], db),
    [
      { playerId: "player-a", robloxUsername: null, robloxAvatarUrl: "https://tr.rbxcdn.com/a.png" },
      { playerId: "player-b", robloxUsername: "B", robloxAvatarUrl: null },
    ],
  );
  assert.deepEqual(calls, [{
    where: { playerId: { in: ["player-a", "player-b", "missing"] } },
    select: { playerId: true, robloxUsername: true, robloxAvatarUrl: true },
  }]);
});

test("empty Player identity presentation requests do not query persistence", async () => {
  let queried = false;
  const db = {
    player: {
      findMany: async () => {
        queried = true;
        return [];
      },
    },
  } as unknown as typeof prisma;

  assert.deepEqual(await getPlayerIdentityPresentationBatch([" ", ""], db), []);
  assert.equal(queried, false);
});

test("current roster counts deduplicate IDs and include Units with no active members", async () => {
  const calls: unknown[] = [];
  const db = {
    unitMembership: {
      groupBy: async (args: unknown) => {
        calls.push(args);
        return [
          { unitId: "unit-a", _count: { _all: 2 } },
          { unitId: "unit-c", _count: { _all: 1 } },
        ];
      },
    },
  } as unknown as typeof prisma;

  assert.deepEqual(
    await getCurrentRosterCounts(["unit-a", "unit-b", "unit-a", "unit-c"], db),
    [
      { unitId: "unit-a", memberCount: 2 },
      { unitId: "unit-b", memberCount: 0 },
      { unitId: "unit-c", memberCount: 1 },
    ],
  );
  assert.deepEqual(calls, [{
    by: ["unitId"],
    where: { unitId: { in: ["unit-a", "unit-b", "unit-c"] }, endedAt: null },
    _count: { _all: true },
  }]);
});

test("empty current roster count requests do not query membership data", async () => {
  let queried = false;
  const db = {
    unitMembership: {
      groupBy: async () => {
        queried = true;
        return [];
      },
    },
  } as unknown as typeof prisma;

  assert.deepEqual(await getCurrentRosterCounts([], db), []);
  assert.equal(queried, false);
});

test("Player active Unit IDs use public Player identity and omit ended memberships", async () => {
  const calls: unknown[] = [];
  const db = {
    unitMembership: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [{ unitId: "unit-b" }, { unitId: "unit-a" }, { unitId: "unit-b" }];
      },
    },
  } as unknown as typeof prisma;

  assert.deepEqual(await getCurrentUnitIdsForPlayer("  player-1  ", db), ["unit-a", "unit-b"]);
  assert.deepEqual(calls, [{
    where: { endedAt: null, player: { is: { playerId: "player-1" } } },
    select: { unitId: true },
    orderBy: [{ unitId: "asc" }],
  }]);
});
