import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  getAverageUnitPerformance,
  getDirectUnitPerformance,
  getOrganizationalUnitPerformance,
} from "./unit";

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

test("Direct excludes descendants but Organizational pools them and Average equal-weights qualifying units", async () => {
  const eventTime = new Date("2026-09-27T12:00:00.000Z");
  const db = {
    event: { findMany: async () => [{ id: "event-1", scheduledAt: eventTime }] },
    audit: { findMany: async () => [
      {
        id: "audit-1",
        atomicEventUnitId: "atomic-1",
        unitType: "REGULAR",
        tickets: 5,
        flagCaptures: 1,
        flagLosses: 0,
        stars: 2,
        atomicEventUnit: { id: "atomic-1", isMandatory: true, eventParticipation: { id: "participation-1", eventId: "event-1", unitId: "unit-1" } },
        playerResults: [{ player: { playerId: "player-1" }, kills: 10, deaths: 2, assists: 3 }],
        roles: [],
      },
      {
        id: "audit-2",
        atomicEventUnitId: "atomic-2",
        unitType: "REGULAR",
        tickets: 8,
        flagCaptures: 2,
        flagLosses: 1,
        stars: 4,
        atomicEventUnit: { id: "atomic-2", isMandatory: true, eventParticipation: { id: "participation-2", eventId: "event-1", unitId: "unit-2" } },
        playerResults: [{ player: { playerId: "player-2" }, kills: 6, deaths: 3, assists: 2 }],
        roles: [],
      },
      {
        id: "audit-3",
        atomicEventUnitId: "atomic-3",
        unitType: "REGULAR",
        tickets: 7,
        flagCaptures: 3,
        flagLosses: 0,
        stars: 5,
        atomicEventUnit: { id: "atomic-3", isMandatory: true, eventParticipation: { id: "participation-3", eventId: "event-1", unitId: "unit-1" } },
        playerResults: [{ player: { playerId: "player-3" }, kills: 8, deaths: 4, assists: 0 }],
        roles: [],
      },
    ] },
    unit: {
      findUnique: async (args: Record<string, unknown>) => {
        const where = args.where as { id: string };
        const select = args.select as { id?: boolean; name?: boolean; parentId?: boolean; rootUnitId?: boolean } | undefined;
        const base = { id: where.id, name: "unit-1", parentId: null, rootUnitId: "unit-1" };
        if (select === undefined) return base;
        const result: Record<string, unknown> = {};
        if (select.id) result.id = base.id;
        if (select.name) result.name = base.name;
        if (select.parentId) result.parentId = base.parentId;
        if (select.rootUnitId) result.rootUnitId = base.rootUnitId;
        return result;
      },
      findMany: async () => [
        { id: "unit-1", parentId: null, rootUnitId: "unit-1" },
        { id: "unit-2", parentId: "unit-1", rootUnitId: "unit-1" },
        { id: "unit-3", parentId: "unit-1", rootUnitId: "unit-1" },
      ],
    },
    unitMembership: { findFirst: async () => null },
    eventCommandGroup: { findMany: async () => [] },
    $queryRaw: async () => [],
  } as unknown as typeof prisma;

  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: db.event.findMany });
  Object.defineProperty(prisma.audit, "findMany", { configurable: true, value: db.audit.findMany });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: db.eventCommandGroup.findMany });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: db.$queryRaw });

  const direct = await getDirectUnitPerformance("unit-1", "all-time", new Date("2026-09-27T00:00:00.000Z"));
  assert.equal(direct.unitTypes[0].totals.kills, 18);
  assert.equal(direct.unitTypes[0].totals.deaths, 6);
  assert.equal(direct.unitTypes[0].killDeathRatio.display, "3");

  const organizational = await getOrganizationalUnitPerformance("unit-1", "all-time", new Date("2026-09-27T00:00:00.000Z"), db);
  assert.equal(organizational.unitTypes[0].totals.kills, 24);
  assert.equal(organizational.unitTypes[0].totals.deaths, 9);
  assert.equal(organizational.unitTypes[0].killDeathRatio.display, "2.6666666666666665");

  const average = await getAverageUnitPerformance("unit-1", "all-time", new Date("2026-09-27T00:00:00.000Z"), db);
  assert.equal(average.unitTypes[0].averagePerQualifyingUnit.kills, 12);
  assert.equal(Object.prototype.hasOwnProperty.call(average.unitTypes[0], "killDeathRatio"), false);
});
