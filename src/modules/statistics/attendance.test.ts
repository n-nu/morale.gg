import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  getAttendanceSummaryForPlayerUnit,
  getAttendanceStateForEvent,
} from "./attendance";

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

test("attendance resolves present, pending, absent, and percentage without pending obligations", async () => {
  const db = {
    event: {
      findMany: async () => [{ id: "event-1", scheduledAt: new Date("2026-09-27T12:00:00.000Z") }],
    },
    atomicEventUnit: {
      findMany: async () => [{ id: "atomic-1" }],
    },
    audit: {
      findMany: async () => [
        {
          id: "audit-mandatory",
          atomicEventUnitId: "atomic-1",
          unitType: "REGULAR",
          atomicEventUnit: {
            id: "atomic-1",
            isMandatory: true,
            eventParticipation: { id: "participation-1", eventId: "event-1", unitId: "unit-1" },
          },
          playerResults: [{ player: { playerId: "game-player-1" }, kills: 1, deaths: 0, assists: 0 }],
          roles: [],
        },
      ],
    },
    player: {
      findUnique: async ({ where }: { where: { playerId: string } }) =>
        where.playerId === "game-player-1" ? { id: "internal-player-1" } : null,
    },
    unitMembership: {
      findFirst: async () => ({
        id: "membership-1",
        unitId: "unit-1",
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        endedAt: null,
      }),
    },
    eventCommandGroup: { findMany: async () => [] },
    $queryRaw: async () => [],
  } as unknown as typeof prisma;

  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: db.event.findMany });
  Object.defineProperty(prisma.audit, "findMany", { configurable: true, value: db.audit.findMany });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: db.eventCommandGroup.findMany });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: db.$queryRaw });

  const present = await getAttendanceStateForEvent({ gamePlayerId: "game-player-1", unitId: "unit-1", eventId: "event-1", db });
  assert.equal(present.state, "PRESENT");

  const summary = await getAttendanceSummaryForPlayerUnit({ gamePlayerId: "game-player-1", unitId: "unit-1", window: "all-time", now: new Date("2026-09-27T00:00:00.000Z"), db });
  assert.equal(summary.obligations, 1);
  assert.equal(summary.present, 1);
  assert.equal(summary.absent, 0);
  assert.equal(summary.pending, 0);
  assert.equal(summary.percentage, 100);
});
