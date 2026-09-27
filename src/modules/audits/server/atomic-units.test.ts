import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { createAtomicEventUnit } from "./atomic-units";

const original = {
  participationFindUnique: prisma.eventParticipation.findUnique,
  atomicCreate: prisma.atomicEventUnit.create,
  userFindUnique: prisma.user.findUnique,
  unitFindMany: prisma.unit.findMany,
  rootFindMany: prisma.rootUnit.findMany,
  grantFindMany: prisma.permissionGrant.findMany,
};

test.after(() => {
  Object.defineProperty(prisma.eventParticipation, "findUnique", { configurable: true, value: original.participationFindUnique });
  Object.defineProperty(prisma.atomicEventUnit, "create", { configurable: true, value: original.atomicCreate });
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: original.userFindUnique });
  Object.defineProperty(prisma.unit, "findMany", { configurable: true, value: original.unitFindMany });
  Object.defineProperty(prisma.rootUnit, "findMany", { configurable: true, value: original.rootFindMany });
  Object.defineProperty(prisma.permissionGrant, "findMany", { configurable: true, value: original.grantFindMany });
});

function installApprovedScenario(status: "APPROVED" | "REQUESTED" | "DENIED") {
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: async () => status === "APPROVED"
      ? {
          id: "participation-1",
          eventId: "event-1",
          unitId: "unit-1",
          event: { id: "event-1", name: "Battle" },
          unit: { id: "unit-1", name: "First Unit" },
        }
      : null,
  });
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === "user-1" ? { id: "user-1" } : null,
  });
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: async () => [{ id: "unit-1", parentId: null, rootUnitId: "unit-1", commanderUserId: "user-1" }],
  });
  Object.defineProperty(prisma.rootUnit, "findMany", {
    configurable: true,
    value: async () => [{ unitId: "unit-1", designatedUnit: { id: "unit-1" } }],
  });
  Object.defineProperty(prisma.permissionGrant, "findMany", {
    configurable: true,
    value: async () => [{
      id: "grant-1",
      authorizedUserMembershipId: "membership-1",
      permission: "SUBMIT_AUDITS",
      scope: "SELF",
      delegatedFromGrantId: null,
      revokedAt: null,
      membership: { id: "membership-1", userId: "user-1", unitId: "unit-1", authorityLevel: 1, endedAt: null },
    }],
  });
}

test("creates an atomic unit only for an approved participation", async () => {
  installApprovedScenario("APPROVED");
  Object.defineProperty(prisma.atomicEventUnit, "create", {
    configurable: true,
    value: async ({ data }: { data: { eventParticipationId: string; isMandatory: boolean } }) => ({
      id: "atomic-1",
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  });

  const result = await createAtomicEventUnit({
    userId: "user-1",
    participationId: "participation-1",
    isMandatory: false,
  });
  assert.equal(result.eventParticipationId, "participation-1");
  assert.equal(result.isMandatory, false);

  installApprovedScenario("REQUESTED");
  await assert.rejects(
    () => createAtomicEventUnit({ userId: "user-1", participationId: "participation-1", isMandatory: true }),
    /Approved EventParticipation not found/,
  );
});
