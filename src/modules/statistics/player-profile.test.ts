import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getPlayerProfileStatistics } from "./player-profile";

const originalEventFindMany = prisma.event.findMany;
const originalAuditFindMany = prisma.audit.findMany;
const originalGroupFindMany = prisma.eventCommandGroup.findMany;
const originalQueryRaw = prisma.$queryRaw;

function profileFixtures(now: Date) {
  const events = Array.from({ length: 51 }, (_, index) => ({
    id: `event-${String(index).padStart(2, "0")}`,
    scheduledAt: new Date(now.getTime() - index * 24 * 60 * 60 * 1000),
    unitType: index % 2 === 0 ? "REGULAR" : "RIFLES",
  }));
  const audits = events.flatMap((event, eventIndex) =>
    [0, 1].map((auditIndex) => {
      const auditId = `${event.id}-audit-${auditIndex}`;
      const atomicEventUnitId = `${event.id}-atomic-${auditIndex}`;
      return {
        id: auditId,
        atomicEventUnitId,
        unitType: event.unitType,
        tickets: 10,
        flagCaptures: 1,
        flagLosses: 0,
        stars: 2,
        atomicEventUnit: {
          id: atomicEventUnitId,
          name: null,
          side: null,
          isMandatory: true,
          eventParticipation: {
            id: `${event.id}-participation`,
            eventId: event.id,
            unitId: `unit-${eventIndex}`,
            unit: { name: `Unit ${eventIndex}` },
          },
        },
        playerResults: [{
          player: { playerId: "profile-player" },
          kills: 4,
          deaths: 0,
          assists: 1,
        }],
        roles: [{ role: "COMMANDER", player: { playerId: "profile-player" } }],
      };
    }),
  );
  const groups = events.map((event, index) => ({
    id: `${event.id}-group`,
    eventId: event.id,
    parentGroupId: null,
    eventParticipation: { unitId: `unit-${index}` },
    commanderPlayer: { playerId: "profile-player" },
    atomicUnitMemberships: [0, 1].map((auditIndex) => ({
      atomicEventUnitId: `${event.id}-atomic-${auditIndex}`,
    })),
  }));

  return { events, audits, groups };
}

test.afterEach(() => {
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: originalEventFindMany });
  Object.defineProperty(prisma.audit, "findMany", { configurable: true, value: originalAuditFindMany });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", { configurable: true, value: originalGroupFindMany });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: originalQueryRaw });
});

test("Player profile applies Event windows and type filters while paging each role independently", async () => {
  const now = new Date("2026-10-31T12:00:00.000Z");
  const { events, audits, groups } = profileFixtures(now);
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () => events.map(({ id, scheduledAt }) => ({ id, scheduledAt })),
  });
  Object.defineProperty(prisma.audit, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { atomicEventUnit: { eventParticipation: { eventId: { in: string[] } } } } }) => {
      const selectedEventIds = new Set(where.atomicEventUnit.eventParticipation.eventId.in);
      return audits.filter(({ atomicEventUnit }) => selectedEventIds.has(atomicEventUnit.eventParticipation.eventId));
    },
  });
  Object.defineProperty(prisma.eventCommandGroup, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { eventId: { in: string[] } } }) => {
      const selectedEventIds = new Set(where.eventId.in);
      return groups.filter(({ eventId }) => selectedEventIds.has(eventId));
    },
  });
  Object.defineProperty(prisma, "$queryRaw", { configurable: true, value: async () => [] });

  const allTime = await getPlayerProfileStatistics({
    gamePlayerId: "profile-player",
    window: "all-time",
    unitType: "REGULAR",
    playerPage: 2,
    commanderPage: 1,
    generalPage: 2,
    now,
  });

  assert.equal(allTime.playerHistory.totalRows, 52);
  assert.equal(allTime.playerHistory.page, 2);
  assert.equal(allTime.playerHistory.rows.length, 2);
  assert.equal(allTime.commanderHistory.totalRows, 52);
  assert.equal(allTime.commanderHistory.page, 1);
  assert.equal(allTime.commanderHistory.rows.length, 50);
  assert.equal(allTime.generalHistory.totalRows, 51);
  assert.equal(allTime.generalHistory.page, 2);
  assert.equal(allTime.generalHistory.rows.length, 1);
  assert.equal(allTime.generalSummary?.qualifyingGroupsCommanded, 51);
  assert.equal(allTime.playerHistory.rows[0].unitType, "REGULAR");
  assert.equal(allTime.playerHistory.rows[0].killDeathRatio.state, "ZERO_DENOMINATOR");
  assert.equal(allTime.playerHistory.rows[0].killDeathRatio.display, "4 K");
  assert.ok(
    allTime.playerHistory.rows[0].occurredAt.getTime()
      >= allTime.playerHistory.rows[1].occurredAt.getTime(),
    "page two continues in newest-first order",
  );

  const recent = await getPlayerProfileStatistics({
    gamePlayerId: "profile-player",
    window: "14d",
    unitType: "REGULAR",
    now,
  });
  assert.equal(recent.playerHistory.totalRows, 16);
  assert.equal(recent.commanderHistory.totalRows, 16);
  assert.equal(recent.generalHistory.totalRows, 15);
  assert.ok(recent.playerHistory.rows.every(({ occurredAt, unitType }) =>
    occurredAt.getTime() >= now.getTime() - 14 * 24 * 60 * 60 * 1000 && unitType === "REGULAR"));
});
