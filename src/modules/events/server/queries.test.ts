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
        { id: "event-b", name: "Second", eventType: "battle", scheduledAt: firstDate, map: null, opponent: "Blue" },
        { id: "event-a", name: "First", eventType: "siege", scheduledAt: new Date("2026-09-01T00:00:00.000Z"), map: "Hill", opponent: null },
      ];
    },
  });

  const result = await getPublicEventPresentationBatch([" event-b ", "event-a", "event-b", "", "missing"]);

  assert.deepEqual(selection, {
    where: { id: { in: ["event-b", "event-a", "missing"] } },
    select: { id: true, name: true, eventType: true, scheduledAt: true, map: true, opponent: true },
  });
  assert.deepEqual(result.map(({ eventId }) => eventId), ["event-b", "event-a"]);
  assert.equal(result[0].name, "Second");
  assert.equal(result[0].map, null);
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
