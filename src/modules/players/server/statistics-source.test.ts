import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { isMembershipActiveAt, getMembershipPeriodAtEventTime } from "./statistics-source";

test("membership is active at event time when started before and not ended before then", async () => {
  const db = {
    player: {
      findUnique: async ({ where }: { where: { playerId: string } }) =>
        where.playerId === "game-player-1" ? { id: "internal-player-1" } : null,
    },
    unitMembership: {
      findFirst: async ({ where }: { where: { playerId: string } }) => {
        assert.equal(where.playerId, "internal-player-1");
        return {
        id: "membership-1",
        unitId: "unit-1",
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        endedAt: new Date("2026-12-31T00:00:00.000Z"),
        };
      },
    },
  } as unknown as typeof prisma;

  assert.equal(await isMembershipActiveAt("game-player-1", "unit-1", new Date("2026-03-01T00:00:00.000Z"), db), true);
  const membership = await getMembershipPeriodAtEventTime("game-player-1", "unit-1", new Date("2026-03-01T00:00:00.000Z"), db);
  assert.equal(membership?.id, "membership-1");
});

test("membership is not active after it ends and not active when joined after the event", async () => {
  const now = new Date("2026-09-27T00:00:00.000Z");
  const endedMembership = {
    id: "membership-1",
    playerId: "player-1",
    unitId: "unit-1",
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    endedAt: new Date("2026-06-01T00:00:00.000Z"),
  };

  const db = {
    player: {
      findUnique: async ({ where }: { where: { playerId: string } }) =>
        where.playerId === "game-player-1" || where.playerId === "game-player-2"
          ? { id: `internal-${where.playerId}` }
          : null,
    },
    unitMembership: {
      findFirst: async (args: Record<string, unknown>) => {
        const where = args.where as { playerId: string; unitId: string; startedAt: { lte: Date } };
        const eventTime = where.startedAt.lte;
        if (where.playerId === "internal-game-player-1" && where.unitId === "unit-1" && eventTime.getTime() < endedMembership.endedAt.getTime()) {
          return endedMembership;
        }
        return null;
      },
    },
  } as unknown as typeof prisma;

  const endedMembershipResult = await getMembershipPeriodAtEventTime("game-player-1", "unit-1", now, db);
  assert.equal(endedMembershipResult, null);
  assert.equal(await isMembershipActiveAt("game-player-1", "unit-1", now, db), false);
  assert.equal(await isMembershipActiveAt("game-player-2", "unit-1", new Date("2026-09-01T00:00:00.000Z"), db), false);
});
