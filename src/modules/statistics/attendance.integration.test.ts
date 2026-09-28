import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getAttendanceStateForEvent, getAttendanceSummaryForPlayerUnit } from "./attendance";
import { getDirectUnitPerformance } from "./unit";

test("PostgreSQL attendance uses historical game Player identity and independent Unit obligations", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  const suffix = randomUUID();
  const parentUnit = await prisma.unit.findFirst({
    where: { parentId: null, rootUnitId: { not: null } },
    select: { id: true, rootUnitId: true, commanderUserId: true },
  });
  assert.ok(parentUnit, "a seeded Unit is required; run the documented database seed");

  const units = await prisma.$transaction(async (transaction) => {
    const createdUnits = [];
    for (let index = 0; index < 3; index += 1) {
      const unit = await transaction.unit.create({
        data: {
          name: `Attendance integration ${suffix} ${index}`,
          parentId: parentUnit.id,
          rootUnitId: parentUnit.rootUnitId,
          commanderUserId: parentUnit.commanderUserId,
        },
        select: { id: true, rootUnitId: true, commanderUserId: true },
      });
      await transaction.authorizedUserMembership.create({
        data: {
          userId: parentUnit.commanderUserId,
          unitId: unit.id,
          authorityLevel: 0,
          createdByUserId: parentUnit.commanderUserId,
        },
      });
      createdUnits.push(unit);
    }
    return createdUnits;
  });
  const createdUnitIds = units.map(({ id }) => id);

  const [unitA, unitB, unitC] = units;
  const players: Array<{ id: string; playerId: string }> = [];
  const eventIds: string[] = [];
  const participationIds: string[] = [];
  const atomicUnits: Array<{ id: string; unitId: string }> = [];
  const auditIds: string[] = [];

  try {
    for (const label of ["eligible", "pending", "late", "mercenary"]) {
      players.push(await prisma.player.create({
        data: { playerId: `attendance-${label}-${suffix}` },
        select: { id: true, playerId: true },
      }));
    }
    const [eligible, pendingPlayer, latePlayer, mercenary] = players;

    const eventTime = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    const event = await prisma.event.create({
      data: {
        name: `Attendance integration ${suffix}`,
        scheduledAt: eventTime,
        eventType: "integration",
        ownerUserId: unitA.commanderUserId,
      },
      select: { id: true },
    });
    eventIds.push(event.id);

    const participations = await Promise.all([unitA, unitB, unitC].map((unit) =>
      prisma.eventParticipation.create({
        data: { eventId: event.id, unitId: unit.id, status: "APPROVED" },
        select: { id: true },
      }),
    ));
    participationIds.push(...participations.map(({ id }) => id));

    for (const [index, isMandatory] of [true, true, true, true, false].entries()) {
      const participationIndex = index < 3 ? 0 : index === 3 ? 1 : 2;
      const atomicUnit = await prisma.atomicEventUnit.create({
        data: { eventParticipationId: participations[participationIndex].id, isMandatory },
        select: { id: true },
      });
      atomicUnits.push({ id: atomicUnit.id, unitId: [unitA.id, unitB.id, unitC.id][participationIndex] });
    }

    const day = 24 * 60 * 60 * 1000;
    await prisma.unitMembership.createMany({
      data: [
        { playerId: eligible.id, unitId: unitA.id, startedAt: new Date(eventTime.getTime() - day) },
        { playerId: eligible.id, unitId: unitB.id, startedAt: new Date(eventTime.getTime() - day) },
        { playerId: pendingPlayer.id, unitId: unitA.id, startedAt: new Date(eventTime.getTime() - day) },
        { playerId: latePlayer.id, unitId: unitA.id, startedAt: new Date(eventTime.getTime() + day) },
      ],
    });

    const finalizeAudit = async (atomicEventUnitId: string, results: Array<{ playerId: string; kills: number }>) => {
      const audit = await prisma.audit.create({
        data: {
          atomicEventUnitId,
          createdByUserId: unitA.commanderUserId,
          lifecycle: "DRAFT",
          unitType: "REGULAR",
          tickets: 10,
          flagCaptures: 1,
          flagLosses: 0,
          stars: 2,
        },
        select: { id: true },
      });
      auditIds.push(audit.id);
      if (results.length > 0) {
        await prisma.auditPlayerResult.createMany({
          data: results.map(({ playerId, kills }) => ({
            auditId: audit.id,
            playerId,
            kills,
            deaths: 0,
            assists: 0,
          })),
        });
      }
      await prisma.audit.update({ where: { id: audit.id }, data: { lifecycle: "FINAL", submittedAt: new Date() } });
    };

    await finalizeAudit(atomicUnits[0].id, [
      { playerId: eligible.id, kills: 7 },
      { playerId: mercenary.id, kills: 11 },
    ]);
    await finalizeAudit(atomicUnits[1].id, []);
    await finalizeAudit(atomicUnits[3].id, []);

    const eligibleA = await getAttendanceStateForEvent({
      gamePlayerId: eligible.playerId,
      unitId: unitA.id,
      eventId: event.id,
    });
    assert.equal(eligibleA.state, "PRESENT");
    assert.equal(eligibleA.obligationExists, true);

    const eligibleASummary = await getAttendanceSummaryForPlayerUnit({
      gamePlayerId: eligible.playerId,
      unitId: unitA.id,
      window: "all-time",
    });
    assert.equal(eligibleASummary.obligations, 1);
    assert.equal(eligibleASummary.present, 1);
    assert.equal(eligibleASummary.percentage, 100);

    const pendingA = await getAttendanceStateForEvent({
      gamePlayerId: pendingPlayer.playerId,
      unitId: unitA.id,
      eventId: event.id,
    });
    assert.equal(pendingA.state, "PENDING");
    const pendingSummary = await getAttendanceSummaryForPlayerUnit({
      gamePlayerId: pendingPlayer.playerId,
      unitId: unitA.id,
      window: "all-time",
    });
    assert.equal(pendingSummary.obligations, 1);
    assert.equal(pendingSummary.pending, 1);
    assert.equal(pendingSummary.resolvedObligations, 0);
    assert.equal(pendingSummary.percentage, null);
    assert.equal(pendingSummary.noResolvedData, true);

    const eligibleB = await getAttendanceStateForEvent({
      gamePlayerId: eligible.playerId,
      unitId: unitB.id,
      eventId: event.id,
    });
    assert.equal(eligibleB.state, "ABSENT");
    const eligibleBSummary = await getAttendanceSummaryForPlayerUnit({
      gamePlayerId: eligible.playerId,
      unitId: unitB.id,
      window: "all-time",
    });
    assert.equal(eligibleBSummary.obligations, 1);
    assert.equal(eligibleBSummary.absent, 1);
    assert.equal(eligibleBSummary.percentage, 0);

    const lateState = await getAttendanceStateForEvent({
      gamePlayerId: latePlayer.playerId,
      unitId: unitA.id,
      eventId: event.id,
    });
    assert.equal(lateState.state, "NO_OBLIGATION");

    const noMandatoryState = await getAttendanceStateForEvent({
      gamePlayerId: eligible.playerId,
      unitId: unitC.id,
      eventId: event.id,
    });
    assert.equal(noMandatoryState.state, "NO_OBLIGATION");
    const noMandatorySummary = await getAttendanceSummaryForPlayerUnit({
      gamePlayerId: eligible.playerId,
      unitId: unitC.id,
      window: "all-time",
    });
    assert.equal(noMandatorySummary.obligations, 0);
    assert.equal(noMandatorySummary.percentage, null);
    assert.equal(noMandatorySummary.noResolvedData, false);

    const mercenaryState = await getAttendanceStateForEvent({
      gamePlayerId: mercenary.playerId,
      unitId: unitA.id,
      eventId: event.id,
    });
    assert.equal(mercenaryState.state, "NO_OBLIGATION");
    assert.equal(await prisma.unitMembership.count({ where: { playerId: mercenary.id } }), 0);

    const combat = await getDirectUnitPerformance(unitA.id, "all-time");
    assert.equal(combat.unitTypes[0].totals.kills, 18);
  } finally {
    const atomicIds = atomicUnits.map(({ id }) => id);
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER audit_player_result_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER audit_role_assignment_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "Audit" DISABLE TRIGGER audit_final_immutability');
      await transaction.auditPlayerResult.deleteMany({ where: { auditId: { in: auditIds } } });
      await transaction.auditRoleAssignment.deleteMany({ where: { auditId: { in: auditIds } } });
      await transaction.audit.deleteMany({ where: { id: { in: auditIds } } });
      await transaction.$executeRawUnsafe('ALTER TABLE "Audit" ENABLE TRIGGER audit_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER audit_role_assignment_final_immutability');
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER audit_player_result_final_immutability');
    });
    await prisma.atomicEventUnit.deleteMany({ where: { id: { in: atomicIds } } });
    await prisma.eventParticipation.deleteMany({ where: { id: { in: participationIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    await prisma.unitMembership.deleteMany({ where: { playerId: { in: players.map(({ id }) => id) } } });
    await prisma.player.deleteMany({ where: { id: { in: players.map(({ id }) => id) } } });
    if (createdUnitIds.length > 0) {
      assert.deepEqual(await prisma.eventParticipation.findMany({
        where: { unitId: { in: createdUnitIds } },
        select: { id: true, event: { select: { name: true } } },
      }), []);
      await prisma.$transaction(async (transaction) => {
        await transaction.authorizedUserMembership.deleteMany({ where: { unitId: { in: createdUnitIds } } });
        await transaction.unit.deleteMany({ where: { id: { in: createdUnitIds } } });
      });
      assert.ok(await prisma.unit.findUnique({ where: { id: parentUnit.id } }));
    }
  }
});