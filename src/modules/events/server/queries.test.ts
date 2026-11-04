import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getPublicEventPresentationBatch } from "./queries";

const originalFindMany = prisma.event.findMany;

test.afterEach(() => {
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: originalFindMany });
});

test("public Event presentation batches deduplicated IDs and preserves request order", async () => {
  const firstDate = new Date("2026-10-01T12:00:00.000Z");
  let selection: unknown;
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async (args: unknown) => {
      selection = args;
      return [
      {
        id: "event-b",
        name: "Second",
        eventType: "battle",
        scheduledAt: firstDate,
        map: null,
        opponent: "Blue",
        attackerName: "Red",
        defenderName: "Blue",
        rallyMinutesBeforeStart: 30,
        durationMinutes: 35,
        invitePolicy: "OPEN",
      },
      {
        id: "event-a",
        name: "First",
        eventType: "siege",
        scheduledAt: new Date("2026-09-01T00:00:00.000Z"),
        map: "Hill",
        opponent: null,
        attackerName: null,
        defenderName: null,
        rallyMinutesBeforeStart: 0,
        durationMinutes: null,
        invitePolicy: "CLOSED",
      },
    ];
    },
  });

  const result = await getPublicEventPresentationBatch([" event-b ", "event-a", "event-b", "", "missing"]);

  assert.deepEqual(selection, {
    where: { id: { in: ["event-b", "event-a", "missing"] } },
    select: {
      id: true,
      name: true,
      eventType: true,
      scheduledAt: true,
      map: true,
      opponent: true,
      attackerName: true,
      defenderName: true,
      rallyMinutesBeforeStart: true,
      durationMinutes: true,
      invitePolicy: true,
    },
  });
  assert.deepEqual(result.map(({ eventId }) => eventId), ["event-b", "event-a"]);
  assert.equal(result[0].name, "Second");
  assert.equal(result[0].map, null);
  assert.equal(result[0].attackerName, "Red");
  assert.equal(result[0].defenderName, "Blue");
  assert.equal(result[0].rallyMinutesBeforeStart, 30);
  assert.equal(result[0].durationMinutes, 35);
  assert.equal(result[0].invitePolicy, "OPEN");
  assert.equal(result[1].durationMinutes, null);
  assert.equal(result[1].invitePolicy, "CLOSED");
  assert.notEqual(result[0].scheduledAt, firstDate);
  assert.equal(result[0].scheduledAt.toISOString(), firstDate.toISOString());
});

test("an empty public Event batch does not query persistence", async () => {
  let queried = false;
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () => {
      queried = true;
      return [];
    },
  });

  assert.deepEqual(await getPublicEventPresentationBatch([" ", ""]), []);
  assert.equal(queried, false);
});
