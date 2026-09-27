import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getCanonicalEventTimes } from "./statistics-source";

const originalFindMany = prisma.event.findMany;

test.afterEach(() => {
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: originalFindMany });
});

test("canonical Event time uses the Events-owned scheduled instant", async () => {
  const scheduledAt = new Date("2026-09-27T12:34:56.789Z");
  let selection: unknown;
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async (args: unknown) => {
      selection = args;
      return [{ id: "event-1", scheduledAt }];
    },
  });

  const result = await getCanonicalEventTimes([" event-1 ", "event-1"]);

  assert.equal(result[0].eventId, "event-1");
  assert.equal(result[0].occurredAt.toISOString(), "2026-09-27T12:34:56.789Z");
  assert.notEqual(result[0].occurredAt, scheduledAt);
  assert.deepEqual(selection, {
    where: { id: { in: ["event-1"] } },
    select: { id: true, scheduledAt: true },
    orderBy: { id: "asc" },
  });
});

test("an explicitly empty Event selection does not query persistence", async () => {
  let queried = false;
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () => {
      queried = true;
      return [];
    },
  });

  assert.deepEqual(await getCanonicalEventTimes([]), []);
  assert.equal(queried, false);
});
