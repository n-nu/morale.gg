import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getGeneralStatistics } from "./general";

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

test("General statistics qualify nested unique descendants and keep combat types separate", async () => {
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: async () => [{ id: "event-1", scheduledAt: new Date("2026-09-27T00:00:00.000Z") }] });
  Object.defineProperty(prisma.audit, "findMany", {
    configurable: true,
    value: async () => [
      {
        id: "audit-regular", atomicEventUnitId: "atomic-1", unitType: "REGULAR", tickets: 10, flagCaptures: 1, flagLosses: 0, stars: 2,
        atomicEventUnit: { id: "atomic-1", isMandatory: true, eventParticipation: { id: "participation-1", eventId: "event-1", unitId: "unit-1" } },
        playerResults: [{ player: { playerId: "general" }, kills: 4, deaths: 2, assists: 1 }], roles: [],
      },
      {
        id: "audit-cavalry", atomicEventUnitId: "atomic-2", unitType: "CAVALRY", tickets: 20, flagCaptures: 2, flagLosses: 1, stars: 3,
        atomicEventUnit: { id: "atomic-2", isMandatory: true, eventParticipation: { id: "participation-1", eventId: "event-1", unitId: "unit-1" } },
        playerResults: [{ player: { playerId: "other" }, kills: 7, deaths: 0, assists: 2 }], roles: [],
      },
    ],
  });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", {
    configurable: true,
    value: async () => [
      {
        id: "parent", eventId: "event-1", parentGroupId: null, representedUnitId: "unit-1", commanderPlayer: { playerId: "general" },
        atomicUnitMemberships: [{ atomicEventUnitId: "atomic-1" }, { atomicEventUnitId: "atomic-2" }],
      },
      {
        id: "child", eventId: "event-1", parentGroupId: "parent", representedUnitId: "unit-2", commanderPlayer: { playerId: "child-commander" },
        atomicUnitMemberships: [{ atomicEventUnitId: "atomic-2" }],
      },
    ],
  });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: async () => [] });

  const result = await getGeneralStatistics("all-time", new Date("2026-09-27T00:00:00.000Z"));
  assert.equal(result.players.length, 1);
  const general = result.players.find(({ gamePlayerId }) => gamePlayerId === "general")!;
  assert.equal(general.qualifyingGroupsCommanded, 1);
  assert.equal(general.distinctEventsCommanded, 1);
  assert.equal(general.totalAtomicUnitsCommanded, 2);
  assert.deepEqual(general.atomicUnitsByType, { REGULAR: 1, RIFLES: 0, CAVALRY: 1, ARTILLERY: 0 });
  assert.deepEqual(general.combatByType.map(({ unitType }) => unitType), ["REGULAR", "CAVALRY"]);
  assert.equal(general.combatByType.find(({ unitType }) => unitType === "CAVALRY")!.killDeathRatio.display, "7 K");
  assert.equal(result.players.some(({ gamePlayerId }) => gamePlayerId === "child-commander"), false);
});