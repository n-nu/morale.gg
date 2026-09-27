import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getApprovedParticipationContext } from "./audits";

const originalFindUnique = prisma.eventParticipation.findUnique;

test.after(() => {
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: originalFindUnique,
  });
});

test("approved participation context is read-only and rejects non-approved records", async () => {
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string; status: string } }) =>
      where.status === "APPROVED"
        ? {
            id: where.id,
            eventId: "event-1",
            unitId: "unit-1",
            event: { id: "event-1", name: "Battle" },
            unit: { id: "unit-1", name: "First Unit" },
          }
        : null,
  });

  assert.deepEqual(await getApprovedParticipationContext("participation-1"), {
    participationId: "participation-1",
    eventId: "event-1",
    unitId: "unit-1",
    event: { id: "event-1", name: "Battle" },
    unit: { id: "unit-1", name: "First Unit" },
  });
  assert.equal(await getApprovedParticipationContext(""), null);
});
