import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getAuditForAtomicUnit } from "./reads";
import { createAuditDraftForAtomicUnit, submitAudit } from "./submission";

test("Audit submission persists identity-only Players, results, roles, and immutable final history", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  const suffix = randomUUID();
  const existingGamePlayerId = `existing-${suffix}`;
  const mercenaryGamePlayerId = `mercenary-${suffix}`;
  const unit = await prisma.unit.findFirst({
    where: { parentId: null, rootUnitId: { not: null } },
    select: { id: true, commanderUserId: true },
  });
  assert.ok(unit, "a seeded Unit is required; run the documented database seed");

  const event = await prisma.event.create({
    data: {
      name: `Audit integration ${suffix}`,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      eventType: "integration",
      ownerUserId: unit.commanderUserId,
    },
    select: { id: true },
  });
  const participation = await prisma.eventParticipation.create({
    data: { eventId: event.id, unitId: unit.id, status: "APPROVED" },
    select: { id: true },
  });
  const atomicUnit = await prisma.atomicEventUnit.create({
    data: { eventParticipationId: participation.id, isMandatory: true },
    select: { id: true },
  });
  const existingPlayer = await prisma.player.create({
    data: { playerId: existingGamePlayerId, name: "Preserve this name" },
    select: { id: true },
  });

  try {
    const draft = await createAuditDraftForAtomicUnit({
      userId: unit.commanderUserId,
      atomicEventUnitId: atomicUnit.id,
      canSubmitAudit: async () => true,
    });
    assert.equal(draft.lifecycle, "DRAFT");
    assert.equal(await getAuditForAtomicUnit(atomicUnit.id, null), null);
    await assert.rejects(
      () => createAuditDraftForAtomicUnit({
        userId: unit.commanderUserId,
        atomicEventUnitId: atomicUnit.id,
        canSubmitAudit: async () => true,
      }),
      /one Audit maximum/i,
    );
    await assert.rejects(
      () => submitAudit({
        userId: "different-creator",
        auditId: draft.id,
        submission: {
          rawData: `${existingGamePlayerId},10,1,2\n${mercenaryGamePlayerId},4,3,1`,
          unitType: "REGULAR",
          tickets: 10,
          flagCaptures: 2,
          flagLosses: 1,
          stars: 3,
          roles: [{ playerId: existingGamePlayerId, role: "COMMANDER" }],
        },
        canSubmitAudit: async () => true,
      }),
      /creator/i,
    );

    const result = await submitAudit({
      userId: unit.commanderUserId,
      auditId: draft.id,
      submission: {
        rawData: `${existingGamePlayerId},10,1,2\n${mercenaryGamePlayerId},4,3,1`,
        unitType: "REGULAR",
        tickets: 10,
        flagCaptures: 2,
        flagLosses: 1,
        stars: 3,
        roles: [
          { playerId: existingGamePlayerId, role: "COMMANDER" },
          { playerId: existingGamePlayerId, role: "FLAG_BEARER" },
        ],
      },
      canSubmitAudit: async () => true,
    });
    assert.equal(result.lifecycle, "FINAL");

    const persisted = await prisma.audit.findUnique({
      where: { id: draft.id },
      include: { playerResults: true, roles: true },
    });
    assert.equal(persisted?.lifecycle, "FINAL");
    assert.equal(persisted?.unitType, "REGULAR");
    assert.equal(persisted?.tickets, 10);
    assert.equal(persisted?.flagCaptures, 2);
    assert.equal(persisted?.flagLosses, 1);
    assert.equal(persisted?.stars, 3);
    assert.equal(persisted?.playerResults.length, 2);
    assert.equal(persisted?.roles.length, 2);
    assert.equal((await prisma.player.findUnique({ where: { id: existingPlayer.id } }))?.name, "Preserve this name");
    const mercenary = await prisma.player.findUnique({ where: { playerId: mercenaryGamePlayerId } });
    assert.equal(mercenary?.name, null);
    assert.equal(await prisma.unitMembership.count({ where: { playerId: { in: [existingPlayer.id, mercenary?.id ?? ""] } } }), 0);
    assert.equal(await getAuditForAtomicUnit(atomicUnit.id, null) !== null, true);
    assert.equal(await getAuditForAtomicUnit(atomicUnit.id, "unrelated-user") !== null, true);

    await assert.rejects(
      () => prisma.audit.update({ where: { id: draft.id }, data: { tickets: 11 } }),
      /immutable|finalized/i,
    );
    await assert.rejects(
      () => prisma.auditPlayerResult.updateMany({ where: { auditId: draft.id }, data: { kills: 99 } }),
      /immutable|finalized/i,
    );
    await assert.rejects(
      () => prisma.audit.delete({ where: { id: draft.id } }),
      /immutable|finalized|restrict/i,
    );
  } finally {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER audit_player_result_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER audit_role_assignment_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "Audit" DISABLE TRIGGER audit_final_immutability');
      await transaction.auditPlayerResult.deleteMany({ where: { audit: { atomicEventUnitId: atomicUnit.id } } });
      await transaction.auditRoleAssignment.deleteMany({ where: { audit: { atomicEventUnitId: atomicUnit.id } } });
      await transaction.audit.deleteMany({ where: { atomicEventUnitId: atomicUnit.id } });
      await transaction.$executeRawUnsafe('ALTER TABLE "Audit" ENABLE TRIGGER audit_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER audit_role_assignment_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER audit_player_result_final_immutability');
    });
    await prisma.atomicEventUnit.delete({ where: { id: atomicUnit.id } });
    await prisma.eventParticipation.delete({ where: { id: participation.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.player.deleteMany({ where: { OR: [{ id: existingPlayer.id }, { playerId: mercenaryGamePlayerId }] } });
  }
});
