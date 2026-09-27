import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { canSubmitAudit } from "./authorization";

const original = {
  userFindUnique: prisma.user.findUnique,
  unitFindMany: prisma.unit.findMany,
  rootFindMany: prisma.rootUnit.findMany,
  grantFindMany: prisma.permissionGrant.findMany,
};

test.after(() => {
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: original.userFindUnique });
  Object.defineProperty(prisma.unit, "findMany", { configurable: true, value: original.unitFindMany });
  Object.defineProperty(prisma.rootUnit, "findMany", { configurable: true, value: original.rootFindMany });
  Object.defineProperty(prisma.permissionGrant, "findMany", { configurable: true, value: original.grantFindMany });
});

test("canSubmitAudit is true only for effective SUBMIT_AUDITS authority", async () => {
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === "user-1" ? { id: where.id } : null,
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
      membership: {
        id: "membership-1",
        userId: "user-1",
        unitId: "unit-1",
        authorityLevel: 1,
        endedAt: null,
      },
    }],
  });

  assert.equal(await canSubmitAudit("user-1", "unit-1"), true);
  assert.equal(await canSubmitAudit("user-1", ""), false);
  assert.equal(await canSubmitAudit("missing", "unit-1"), false);
});
