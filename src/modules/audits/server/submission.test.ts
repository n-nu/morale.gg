import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  parseAuditRows,
  createAuditDraftForAtomicUnit,
  submitAudit,
  type AuditSubmissionInput,
} from "./submission";

const original = {
  atomicFindUnique: prisma.atomicEventUnit.findUnique,
  auditFindUnique: prisma.audit?.findUnique,
  auditCreate: prisma.audit?.create,
  auditUpdate: prisma.audit?.update,
  playerFindUnique: prisma.player.findUnique,
  playerCreate: prisma.player.create,
  resultCreateMany: prisma.auditPlayerResult?.createMany,
  resultCreate: prisma.auditPlayerResult?.create,
  roleCreateMany: prisma.auditRoleAssignment?.createMany,
};

function setModelProperty<T extends object, K extends string>(target: T, key: K, value: unknown) {
  Object.defineProperty(target, key, { configurable: true, value });
}

test.after(() => {
  Object.defineProperty(prisma.atomicEventUnit, "findUnique", { configurable: true, value: original.atomicFindUnique });
  if (prisma.audit) {
    Object.defineProperty(prisma.audit, "findUnique", { configurable: true, value: original.auditFindUnique });
    Object.defineProperty(prisma.audit, "create", { configurable: true, value: original.auditCreate });
    Object.defineProperty(prisma.audit, "update", { configurable: true, value: original.auditUpdate });
  }
  Object.defineProperty(prisma.player, "findUnique", { configurable: true, value: original.playerFindUnique });
  Object.defineProperty(prisma.player, "create", { configurable: true, value: original.playerCreate });
  if (prisma.auditPlayerResult) {
    Object.defineProperty(prisma.auditPlayerResult, "createMany", { configurable: true, value: original.resultCreateMany });
    Object.defineProperty(prisma.auditPlayerResult, "create", { configurable: true, value: original.resultCreate });
  }
  if (prisma.auditRoleAssignment) {
    Object.defineProperty(prisma.auditRoleAssignment, "createMany", { configurable: true, value: original.roleCreateMany });
  }
});

test("parseAuditRows accepts valid compact input", () => {
  const rows = parseAuditRows("p1,10,2,3\np2,0,1,4\n");
  assert.deepEqual(rows, [
    { playerId: "p1", kills: 10, deaths: 2, assists: 3 },
    { playerId: "p2", kills: 0, deaths: 1, assists: 4 },
  ]);
});

test("parseAuditRows rejects malformed and duplicate input", () => {
  assert.throws(() => parseAuditRows("p1,10,2"), /malformed/i);
  assert.throws(() => parseAuditRows("p1,10,2,3\np1,1,2,3"), /duplicate/i);
  assert.throws(() => parseAuditRows("bad id,10,2,3"), /PlayerID/i);
  assert.throws(() => parseAuditRows("p1,-1,2,3"), /numeric/i);
});

test("createAuditDraftForAtomicUnit enforces auth and unit ownership", async () => {
  setModelProperty(prisma.atomicEventUnit, "findUnique", async () => ({
    id: "atomic-1",
    eventParticipationId: "participation-1",
    isMandatory: true,
    eventParticipation: { id: "participation-1", status: "APPROVED", unitId: "unit-1" },
  }));
  setModelProperty(prisma, "audit", {
    findUnique: async () => null,
    create: async ({ data }: { data: { atomicEventUnitId: string; createdByUserId: string; lifecycle: string } }) => ({
      id: "audit-1",
      atomicEventUnitId: data.atomicEventUnitId,
      createdByUserId: data.createdByUserId,
      lifecycle: data.lifecycle,
      rawData: null,
      unitType: null,
      tickets: null,
      flagCaptures: null,
      flagLosses: null,
      stars: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
    }),
  });

  const allowed = await createAuditDraftForAtomicUnit({ userId: "user-1", atomicEventUnitId: "atomic-1", canSubmitAudit: async () => true });
  assert.equal(allowed.lifecycle, "DRAFT");

  await assert.rejects(
    () => createAuditDraftForAtomicUnit({ userId: "user-2", atomicEventUnitId: "atomic-1", canSubmitAudit: async () => false }),
    /Unauthorized|cannot submit/i,
  );
});

test("submitAudit validates required final fields and auto-finalizes", async () => {
  const rawData = "p1,3,1,2\np2,4,2,1";
  const submission: AuditSubmissionInput = {
    rawData,
    unitType: "REGULAR",
    tickets: 10,
    flagCaptures: 2,
    flagLosses: 1,
    stars: 3,
    roles: [{ playerId: "p1", role: "COMMANDER" }, { playerId: "p1", role: "FLAG_BEARER" }],
  };

  let lifecycle: "DRAFT" | "FINAL" = "DRAFT";

  const audit = {
    id: "audit-1",
    atomicEventUnitId: "atomic-1",
    createdByUserId: "user-1",
    lifecycle,
    rawData: null,
    unitType: null,
    tickets: null,
    flagCaptures: null,
    flagLosses: null,
    stars: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    submittedAt: null,
    atomicEventUnit: {
      eventParticipation: { unitId: "unit-1", status: "APPROVED" },
    },
  };

  setModelProperty(prisma, "audit", {
    findUnique: async () => audit,
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      ...audit,
      ...data,
      id: where.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  });
  Object.defineProperty(prisma.player, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { playerId: string } }) => ({ id: `player-${where.playerId}`, playerId: where.playerId }),
  });
  Object.defineProperty(prisma.player, "create", {
    configurable: true,
    value: async ({ data }: { data: { playerId: string; name: null } }) => ({ id: `player-${data.playerId}`, playerId: data.playerId, name: data.name }),
  });
  setModelProperty(prisma, "auditPlayerResult", {
    createMany: async () => ({ count: 2 }),
  });
  setModelProperty(prisma, "auditRoleAssignment", {
    createMany: async () => ({ count: 2 }),
  });

  const result = await submitAudit({
    userId: "user-1",
    auditId: "audit-1",
    submission,
    resolvePlayerByGameId: async (value: string) => ({ id: `player-${value}`, playerId: value }),
    canSubmitAudit: async () => true,
    transaction: async (callback) => callback({
      audit: {
        findUnique: async () => ({ id: "audit-1", lifecycle }),
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
          id: where.id,
          lifecycle: data.lifecycle,
          unitType: data.unitType,
          tickets: Number(data.tickets ?? 0),
        }),
      },
      auditPlayerResult: {
        createMany: async () => ({ count: 2 }),
      },
      auditRoleAssignment: {
        createMany: async () => ({ count: 2 }),
      },
    } as never),
  });

  lifecycle = "FINAL";

  assert.equal(result.lifecycle, "FINAL");
  assert.equal(result.unitType, "REGULAR");
  assert.equal(result.tickets, 10);

  await assert.rejects(
    () => submitAudit({
      userId: "user-1",
      auditId: "audit-1",
      submission,
      resolvePlayerByGameId: async (value: string) => ({ id: `player-${value}`, playerId: value }),
      canSubmitAudit: async () => true,
      transaction: async (callback) => callback({
        audit: {
          findUnique: async () => ({ id: "audit-1", lifecycle: "FINAL" }),
          update: async () => {
            throw new Error("should not update finalized audit");
          },
        },
        auditPlayerResult: {
          createMany: async () => ({ count: 2 }),
        },
        auditRoleAssignment: {
          createMany: async () => ({ count: 2 }),
        },
      } as never),
    }),
    /finalized|immutable|FINAL/i,
  );
});

test("submitAudit accepts every historical Unit type with its required roles", async () => {
  const originalAudit = prisma.audit?.findUnique;
  const unitTypes = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;

  try {
    for (const [index, unitType] of unitTypes.entries()) {
      const auditId = `audit-type-${index}`;
      Object.defineProperty(prisma.audit, "findUnique", {
        configurable: true,
        value: async () => ({
          id: auditId,
          atomicEventUnitId: `atomic-${index}`,
          createdByUserId: "user-1",
          lifecycle: "DRAFT",
          atomicEventUnit: { eventParticipation: { unitId: "unit-1", status: "APPROVED" } },
        }),
      });

      const result = await submitAudit({
        userId: "user-1",
        auditId,
        submission: {
          rawData: "p1,1,1,1",
          unitType,
          tickets: 1,
          flagCaptures: 0,
          flagLosses: 0,
          stars: 1,
          roles: [
            { playerId: "p1", role: "COMMANDER" },
            ...(unitType === "REGULAR" ? [{ playerId: "p1", role: "FLAG_BEARER" as const }] : []),
          ],
        },
        canSubmitAudit: async () => true,
        resolvePlayerByGameId: async (playerId) => ({ id: `resolved-${playerId}`, playerId }),
        transaction: async (callback) => callback({
          audit: {
            findUnique: async () => ({ id: auditId, lifecycle: "DRAFT" }),
            update: async () => ({ id: auditId, lifecycle: "FINAL", unitType, tickets: 1 }),
          },
          auditPlayerResult: { createMany: async () => ({ count: 1 }) },
          auditRoleAssignment: { createMany: async () => ({ count: unitType === "REGULAR" ? 2 : 1 }) },
        } as never),
      });

      assert.equal(result.lifecycle, "FINAL");
      assert.equal(result.unitType, unitType);
    }
  } finally {
    Object.defineProperty(prisma.audit, "findUnique", { configurable: true, value: originalAudit });
  }
});
