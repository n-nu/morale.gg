import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  requestEventParticipation,
  transitionEventParticipationStatus,
  validateEventParticipationTransition,
} from "./event-participation";

const originalDelegates = {
  eventFindUnique: prisma.event.findUnique,
  unitFindUnique: prisma.unit.findUnique,
  participationFindUnique: prisma.eventParticipation.findUnique,
  participationCreate: prisma.eventParticipation.create,
  userFindUnique: prisma.user.findUnique,
  unitFindMany: prisma.unit.findMany,
  rootFindMany: prisma.rootUnit.findMany,
  grantFindMany: prisma.permissionGrant.findMany,
};

function installUniquePermissionScenario({
  granted,
  eventId,
  unitId,
  eventInFuture = true,
  existingParticipation = null,
}: {
  granted: boolean;
  eventId: string;
  unitId: string;
  eventInFuture?: boolean;
  existingParticipation?: null | { id: string; eventId: string; unitId: string; status: "REQUESTED" | "APPROVED" | "DENIED" };
}) {
  const rootId = "root-1";
  const userId = "user-1";

  Object.defineProperty(prisma.event, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === eventId
        ? { id: eventId, scheduledAt: new Date(eventInFuture ? Date.now() + 60_000 : Date.now() - 60_000) }
        : null,
  });
  Object.defineProperty(prisma.unit, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === unitId ? { id: unitId, parentId: rootId, rootUnitId: rootId } : null,
  });
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: async () => existingParticipation,
  });
  Object.defineProperty(prisma.eventParticipation, "create", {
    configurable: true,
    value: async ({ data }: { data: { eventId: string; unitId: string; status: "REQUESTED" } }) => ({
      id: "participation-1",
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  });
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === userId ? { id: userId } : null,
  });
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: async () => [
      { id: rootId, parentId: null, rootUnitId: rootId },
      { id: unitId, parentId: rootId, rootUnitId: rootId },
    ],
  });
  Object.defineProperty(prisma.rootUnit, "findMany", {
    configurable: true,
    value: async () => [{ unitId: rootId, designatedUnit: { id: rootId } }],
  });
  Object.defineProperty(prisma.permissionGrant, "findMany", {
    configurable: true,
    value: async () =>
      granted
        ? [
            {
              id: "grant-1",
              authorizedUserMembershipId: "membership-1",
              permission: "REQUEST_EVENT_PARTICIPATION",
              scope: "SELF",
              delegatedFromGrantId: null,
              revokedAt: null,
              membership: {
                userId,
                unitId,
                authorityLevel: 1,
              },
            },
          ]
        : [],
  });
}

test.afterEach(() => {
  Object.defineProperty(prisma.event, "findUnique", {
    configurable: true,
    value: originalDelegates.eventFindUnique,
  });
  Object.defineProperty(prisma.unit, "findUnique", {
    configurable: true,
    value: originalDelegates.unitFindUnique,
  });
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: originalDelegates.participationFindUnique,
  });
  Object.defineProperty(prisma.eventParticipation, "create", {
    configurable: true,
    value: originalDelegates.participationCreate,
  });
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: originalDelegates.userFindUnique,
  });
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: originalDelegates.unitFindMany,
  });
  Object.defineProperty(prisma.rootUnit, "findMany", {
    configurable: true,
    value: originalDelegates.rootFindMany,
  });
  Object.defineProperty(prisma.permissionGrant, "findMany", {
    configurable: true,
    value: originalDelegates.grantFindMany,
  });
});

test("creates a REQUESTED participation for a valid event and unit", async () => {
  const eventId = "evt-valid";
  const unitId = "unit-valid";
  installUniquePermissionScenario({ granted: true, eventId, unitId });

  const result = await requestEventParticipation({ userId: "user-1", eventId, unitId });

  assert.equal(result.status, "REQUESTED");
  assert.equal(result.eventId, eventId);
  assert.equal(result.unitId, unitId);
});

test("rejects missing event", async () => {
  installUniquePermissionScenario({ granted: true, eventId: "missing-event", unitId: "unit-valid" });
  Object.defineProperty(prisma.event, "findUnique", {
    configurable: true,
    value: async () => null,
  });

  await assert.rejects(
    () => requestEventParticipation({ userId: "user-1", eventId: "missing-event", unitId: "unit-valid" }),
    /Event not found/i,
  );
});

test("rejects missing unit", async () => {
  installUniquePermissionScenario({ granted: true, eventId: "evt-valid", unitId: "missing-unit" });
  Object.defineProperty(prisma.unit, "findUnique", {
    configurable: true,
    value: async () => null,
  });

  await assert.rejects(
    () => requestEventParticipation({ userId: "user-1", eventId: "evt-valid", unitId: "missing-unit" }),
    /Unit not found/i,
  );
});

test("rejects duplicate Event/Unit participation", async () => {
  const eventId = "evt-dup";
  const unitId = "unit-dup";
  installUniquePermissionScenario({
    granted: true,
    eventId,
    unitId,
    existingParticipation: { id: "existing-1", eventId, unitId, status: "REQUESTED" },
  });

  await assert.rejects(
    () => requestEventParticipation({ userId: "user-1", eventId, unitId }),
    /already exists for this Event and Unit/i,
  );
});

test("rejects unauthorized requests through the real Units permission boundary", async () => {
  const eventId = "evt-unauthorized";
  const unitId = "unit-unauthorized";
  installUniquePermissionScenario({ granted: false, eventId, unitId });

  await assert.rejects(
    () => requestEventParticipation({ userId: "user-1", eventId, unitId }),
    /Unauthorized/i,
  );
});

test("rejects past/ineligible events", async () => {
  const eventId = "evt-past";
  const unitId = "unit-past";
  installUniquePermissionScenario({ granted: true, eventId, unitId, eventInFuture: false });

  await assert.rejects(
    () => requestEventParticipation({ userId: "user-1", eventId, unitId }),
    /future events/i,
  );
});

test("allows valid lifecycle transitions and rejects terminal or invalid transitions", () => {
  assert.equal(validateEventParticipationTransition("REQUESTED", "APPROVED"), true);
  assert.equal(validateEventParticipationTransition("REQUESTED", "DENIED"), true);
  assert.equal(validateEventParticipationTransition("APPROVED", "APPROVED"), false);
  assert.equal(validateEventParticipationTransition("APPROVED", "DENIED"), false);
  assert.equal(validateEventParticipationTransition("DENIED", "APPROVED"), false);
  assert.equal(transitionEventParticipationStatus("REQUESTED", "APPROVED").status, "APPROVED");
  assert.equal(transitionEventParticipationStatus("REQUESTED", "DENIED").status, "DENIED");

  assert.throws(() => transitionEventParticipationStatus("APPROVED", "DENIED"), /invalid/i);
  assert.throws(() => transitionEventParticipationStatus("DENIED", "APPROVED"), /invalid/i);
});
