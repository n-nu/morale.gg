import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getCommanderStatistics } from "./commander";

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

test("Commander statistics use battlefield roles, pooled ratios, averages, and Event windows", async () => {
  const now = new Date("2026-09-27T00:00:00.000Z");
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () => [
      { id: "recent", scheduledAt: new Date("2026-09-26T00:00:00.000Z") },
      { id: "old", scheduledAt: new Date("2026-09-01T00:00:00.000Z") },
    ],
  });
  Object.defineProperty(prisma.audit, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { atomicEventUnit: { eventParticipation: { eventId: { in: string[] } } } } }) => {
      const eventId = where.atomicEventUnit.eventParticipation.eventId.in[0];
      return eventId === "recent"
        ? [{
            id: "audit-1", atomicEventUnitId: "atomic-1", unitType: "REGULAR", tickets: 10, flagCaptures: 2, flagLosses: 1, stars: 3,
            atomicEventUnit: { id: "atomic-1", isMandatory: true, eventParticipation: { id: "participation-1", eventId, unitId: "unit-1" } },
            playerResults: [{ player: { playerId: "commander" }, kills: 8, deaths: 0, assists: 2 }],
            roles: [{ role: "COMMANDER", player: { playerId: "commander" } }],
          }]
        : [{
            id: "audit-old", atomicEventUnitId: "atomic-old", unitType: "RIFLES", tickets: 99, flagCaptures: 9, flagLosses: 9, stars: 9,
            atomicEventUnit: { id: "atomic-old", isMandatory: true, eventParticipation: { id: "participation-old", eventId, unitId: "unit-1" } },
            playerResults: [{ player: { playerId: "commander" }, kills: 99, deaths: 1, assists: 99 }],
            roles: [{ role: "FLAG_BEARER", player: { playerId: "commander" } }],
          }];
    },
  });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: async () => [] });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: async () => [] });

  const result = await getCommanderStatistics(undefined, now);
  assert.deepEqual(result.players[0].unitTypes.map(({ unitType }) => unitType), ["REGULAR"]);
  const regular = result.players[0].unitTypes[0];
  assert.equal(regular.battlesCommanded, 1);
  assert.deepEqual(regular.totals, { kills: 8, deaths: 0, assists: 2, tickets: 10, flagCaptures: 2, flagLosses: 1, stars: 3 });
  assert.equal(regular.killDeathRatio.display, "8 K");
  assert.deepEqual(regular.averagesPerBattle, { kills: 8, deaths: 0, assists: 2, tickets: 10, flagCaptures: 2, flagLosses: 1, stars: 3, playerCount: 1 });
  assert.equal((await getCommanderStatistics("all-time", now)).players[0].unitTypes.length, 1);
});