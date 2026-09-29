import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getEffectiveFinalizedAuditObservations } from "./statistics-source";

const originalAuditFindMany = prisma.audit.findMany;
const originalGroupFindMany = prisma.eventCommandGroup.findMany;
const originalQueryRaw = prisma.$queryRaw;

test.afterEach(() => {
  Object.defineProperty(prisma.audit, "findMany", { configurable: true, value: originalAuditFindMany });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: originalGroupFindMany });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: originalQueryRaw });
});

test("effective Audit source returns public raw facts and type-partitioned aggregates", async () => {
  let auditFilter: unknown;
  Object.defineProperty(prisma.audit, "findMany", {
    configurable: true,
    value: async ({ where }: { where: unknown }) => {
      auditFilter = where;
      return [{
        id: "audit-final",
        atomicEventUnitId: "atomic-1",
        unitType: "REGULAR",
        tickets: 20,
        flagCaptures: 2,
        flagLosses: 1,
        stars: 3,
        atomicEventUnit: {
          id: "atomic-1",
          isMandatory: true,
          eventParticipation: { id: "participation-1", eventId: "event-1", unitId: "unit-1" },
        },
        playerResults: [{ player: { playerId: "game-player-1" }, kills: 10, deaths: 0, assists: 4 }],
        roles: [{ role: "COMMANDER", player: { playerId: "game-player-1" } }],
      }];
    },
  });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", {
    configurable: true,
    value: async () => [
      {
        id: "group-parent",
        eventId: "event-1",
        parentGroupId: null,
        eventParticipation: { unitId: "unit-1" },
        commanderPlayer: { playerId: "game-player-1" },
        atomicUnitMemberships: [{ atomicEventUnitId: "atomic-1" }],
      },
      {
        id: "group-child",
        eventId: "event-1",
        parentGroupId: "group-parent",
        eventParticipation: { unitId: "unit-2" },
        commanderPlayer: { playerId: "game-player-2" },
        atomicUnitMemberships: [{ atomicEventUnitId: "atomic-2" }],
      },
    ],
  });
  Object.defineProperty(prisma, "$queryRaw", {
    configurable: true,
    value: async () => [{
      gamePlayerId: "game-player-1",
      unitType: "REGULAR",
      kills: BigInt(10),
      deaths: BigInt(0),
      assists: BigInt(4),
      auditAppearances: BigInt(1),
      distinctEvents: BigInt(1),
    }],
  });

  const source = await getEffectiveFinalizedAuditObservations(["event-1"]);

  assert.deepEqual(auditFilter, {
    lifecycle: "FINAL",
    atomicEventUnit: { eventParticipation: { eventId: { in: ["event-1"] } } },
  });
  assert.equal(source.observations.length, 1);
  assert.equal(source.observations[0].isMandatory, true);
  assert.equal(source.observations[0].unitResults.tickets, 20);
  assert.deepEqual(source.observations[0].playerResults, [
    { gamePlayerId: "game-player-1", publicName: null, kills: 10, deaths: 0, assists: 4 },
  ]);
  assert.equal(source.observations[0].commanderGamePlayerId, "game-player-1");
  assert.deepEqual(source.rankerAggregates, [{
    gamePlayerId: "game-player-1",
    unitType: "REGULAR",
    kills: 10,
    deaths: 0,
    assists: 4,
    auditAppearances: 1,
    distinctEvents: 1,
  }]);
  assert.deepEqual(source.commandGroupDescendants[0].descendantAtomicEventUnitIds, ["atomic-1", "atomic-2"]);
  assert.equal(JSON.stringify(source).includes("createdByUserId"), false);
  assert.equal(JSON.stringify(source).includes("submitter@example.test"), false);
});

test("effective Audit source handles an empty Event selection without querying", async () => {
  const source = await getEffectiveFinalizedAuditObservations([]);
  assert.deepEqual(source, { observations: [], rankerAggregates: [], commandGroupDescendants: [] });
});
