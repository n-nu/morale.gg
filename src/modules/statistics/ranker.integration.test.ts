import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getRankerStatistics } from "./ranker";

async function cleanupRankerTestData() {
  const prefix = "ranker-";
  const playerIds = (await prisma.player.findMany({
    where: { playerId: { startsWith: prefix } },
    select: { id: true },
  })).map(({ id }) => id);

  const eventIds = (await prisma.event.findMany({
    where: { name: { startsWith: "Ranker " } },
    select: { id: true },
  })).map(({ id }) => id);

  const participationIds = (await prisma.eventParticipation.findMany({
    where: { eventId: { in: eventIds } },
    select: { id: true },
  })).map(({ id }) => id);

  const atomicIds = (await prisma.atomicEventUnit.findMany({
    where: { eventParticipationId: { in: participationIds } },
    select: { id: true },
  })).map(({ id }) => id);

  const auditIds = (await prisma.audit.findMany({
    where: { atomicEventUnitId: { in: atomicIds } },
    select: { id: true },
  })).map(({ id }) => id);

  await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER audit_player_result_final_immutability');
  await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER audit_role_assignment_final_immutability');
  await prisma.$executeRawUnsafe('ALTER TABLE "Audit" DISABLE TRIGGER audit_final_immutability');
  try {
    if (auditIds.length > 0) {
      await prisma.auditPlayerResult.deleteMany({ where: { auditId: { in: auditIds } } });
      await prisma.auditRoleAssignment.deleteMany({ where: { auditId: { in: auditIds } } });
      await prisma.audit.deleteMany({ where: { id: { in: auditIds } } });
    }
    if (atomicIds.length > 0) {
      await prisma.atomicEventUnit.deleteMany({ where: { id: { in: atomicIds } } });
    }
    if (participationIds.length > 0) {
      await prisma.eventParticipation.deleteMany({ where: { id: { in: participationIds } } });
    }
    if (eventIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    if (playerIds.length > 0) {
      await prisma.unitMembership.deleteMany({ where: { playerId: { in: playerIds } } });
      await prisma.player.deleteMany({ where: { id: { in: playerIds } } });
    }
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "Audit" ENABLE TRIGGER audit_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER audit_role_assignment_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER audit_player_result_final_immutability');
  }
}

test("public Ranker reads aggregate effective Audits by Event time and historical type", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  await cleanupRankerTestData();

  const suffix = randomUUID();
  const now = new Date();
  const primaryUnit = await prisma.unit.findFirst({
    where: { rootUnitId: { not: null } },
    select: { id: true, rootUnitId: true, commanderUserId: true },
  });
  assert.ok(primaryUnit, "a seeded Unit is required; run the documented database seed");
  const existingOtherUnit = await prisma.unit.findFirst({
    where: { id: { not: primaryUnit.id } },
    select: { id: true },
  });
  let createdOtherUnitId: string | null = null;
  const otherUnit = existingOtherUnit ?? await prisma.$transaction(async (transaction) => {
    const created = await transaction.unit.create({
      data: {
        name: `Ranker test roster ${suffix}`,
        parentId: primaryUnit.id,
        rootUnitId: primaryUnit.rootUnitId,
        commanderUserId: primaryUnit.commanderUserId,
      },
      select: { id: true },
    });
    await transaction.authorizedUserMembership.create({
      data: {
        userId: primaryUnit.commanderUserId,
        unitId: created.id,
        authorityLevel: 0,
        createdByUserId: primaryUnit.commanderUserId,
      },
    });
    createdOtherUnitId = created.id;
    return created;
  });

  const players = await Promise.all([
    prisma.player.create({ data: { playerId: `ranker-rostered-${suffix}` }, select: { id: true, playerId: true } }),
    prisma.player.create({ data: { playerId: `ranker-mercenary-${suffix}` }, select: { id: true, playerId: true } }),
    prisma.player.create({ data: { playerId: `ranker-elsewhere-${suffix}` }, select: { id: true, playerId: true } }),
    prisma.player.create({ data: { playerId: `ranker-never-rostered-${suffix}` }, select: { id: true, playerId: true } }),
  ]);
  const [rosteredPlayer, mercenaryPlayer, elsewherePlayer, neverRosteredPlayer] = players;
  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: `Ranker recent ${suffix}`,
        scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        eventType: "integration",
        ownerUserId: primaryUnit.commanderUserId,
      },
      select: { id: true },
    }),
    prisma.event.create({
      data: {
        name: `Ranker older ${suffix}`,
        scheduledAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        eventType: "integration",
        ownerUserId: primaryUnit.commanderUserId,
      },
      select: { id: true },
    }),
  ]);
  const [recentEvent, olderEvent] = events;
  const participations = await Promise.all([
    prisma.eventParticipation.create({
      data: { eventId: recentEvent.id, unitId: primaryUnit.id, status: "APPROVED" },
      select: { id: true },
    }),
    prisma.eventParticipation.create({
      data: { eventId: olderEvent.id, unitId: primaryUnit.id, status: "APPROVED" },
      select: { id: true },
    }),
  ]);
  const atomicUnits: Array<{ id: string; participationId: string; type: "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY"; final: boolean }> = [];
  const atomicInputs = [
    { participationId: participations[0].id, type: "REGULAR" as const, final: true },
    { participationId: participations[0].id, type: "REGULAR" as const, final: true },
    { participationId: participations[0].id, type: "RIFLES" as const, final: true },
    { participationId: participations[0].id, type: "ARTILLERY" as const, final: true },
    { participationId: participations[0].id, type: "ARTILLERY" as const, final: false },
    { participationId: participations[1].id, type: "CAVALRY" as const, final: true },
  ];

  try {
    await prisma.unitMembership.create({
      data: { playerId: rosteredPlayer.id, unitId: primaryUnit.id, startedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
    });
    await prisma.unitMembership.create({
      data: { playerId: elsewherePlayer.id, unitId: otherUnit.id, startedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
    });

    for (const input of atomicInputs) {
      const atomicUnit = await prisma.atomicEventUnit.create({
        data: { eventParticipationId: input.participationId, isMandatory: true },
        select: { id: true },
      });
      atomicUnits.push({ ...atomicUnit, participationId: input.participationId, type: input.type, final: input.final });
    }

    const playerResults = [
      { playerId: rosteredPlayer.id, kills: 10, deaths: 2, assists: 4 },
      { playerId: mercenaryPlayer.id, kills: 1, deaths: 1, assists: 0 },
      { playerId: elsewherePlayer.id, kills: 3, deaths: 2, assists: 1 },
      { playerId: neverRosteredPlayer.id, kills: 0, deaths: 1, assists: 0 },
    ];
    const finalizedAtomicUnits = atomicUnits.filter(({ final: isFinal }) => isFinal);

    for (const [index, atomicUnit] of finalizedAtomicUnits.entries()) {
      const audit = await prisma.audit.create({
        data: {
          atomicEventUnitId: atomicUnit.id,
          createdByUserId: primaryUnit.commanderUserId,
          lifecycle: "DRAFT",
          unitType: atomicUnit.type,
          tickets: 10,
          flagCaptures: 1,
          flagLosses: 0,
          stars: 2,
        },
        select: { id: true },
      });
      const results = index === 0
        ? playerResults
        : [{
            playerId: rosteredPlayer.id,
            kills: atomicUnit.type === "REGULAR" ? 4 : atomicUnit.type === "RIFLES" ? 5 : atomicUnit.type === "ARTILLERY" ? 3 : 2,
            deaths: atomicUnit.type === "REGULAR" ? 2 : atomicUnit.type === "RIFLES" || atomicUnit.type === "ARTILLERY" ? 0 : 1,
            assists: atomicUnit.type === "REGULAR" ? 2 : atomicUnit.type === "RIFLES" ? 1 : 0,
          }];
      await prisma.auditPlayerResult.createMany({ data: results.map((result) => ({ ...result, auditId: audit.id })) });
      await prisma.auditRoleAssignment.create({
        data: { auditId: audit.id, playerId: rosteredPlayer.id, role: "COMMANDER" },
      });
      if (atomicUnit.type === "REGULAR") {
        await prisma.auditRoleAssignment.create({
          data: { auditId: audit.id, playerId: rosteredPlayer.id, role: "FLAG_BEARER" },
        });
      }
      await prisma.audit.update({ where: { id: audit.id }, data: { lifecycle: "FINAL", submittedAt: now } });
    }

    const draftAudit = await prisma.audit.create({
      data: {
        atomicEventUnitId: atomicUnits.find(({ final: isFinal }) => !isFinal)!.id,
        createdByUserId: primaryUnit.commanderUserId,
        lifecycle: "DRAFT",
        unitType: "ARTILLERY",
      },
      select: { id: true },
    });
    await prisma.auditPlayerResult.create({
      data: { auditId: draftAudit.id, playerId: rosteredPlayer.id, kills: 999, deaths: 0, assists: 999 },
    });

    const sourceSnapshot = {
      players: await prisma.player.findMany({ where: { id: { in: players.map(({ id }) => id) } }, orderBy: { id: "asc" } }),
      memberships: await prisma.unitMembership.findMany({ where: { playerId: { in: players.map(({ id }) => id) } }, orderBy: { id: "asc" } }),
      resultCount: await prisma.auditPlayerResult.count({
        where: { audit: { atomicEventUnitId: { in: atomicUnits.map(({ id }) => id) } } },
      }),
    };

    const defaultResult = await getRankerStatistics(undefined, now);
    const thirtyDayResult = await getRankerStatistics("30d", now);
    const allTimeResult = await getRankerStatistics("all-time", now);
    const sourceAfterRead = {
      players: await prisma.player.findMany({ where: { id: { in: players.map(({ id }) => id) } }, orderBy: { id: "asc" } }),
      memberships: await prisma.unitMembership.findMany({ where: { playerId: { in: players.map(({ id }) => id) } }, orderBy: { id: "asc" } }),
      resultCount: await prisma.auditPlayerResult.count({
        where: { audit: { atomicEventUnitId: { in: atomicUnits.map(({ id }) => id) } } },
      }),
    };

    const playerFor = (result: typeof defaultResult, gamePlayerId: string) =>
      result.players.find((player) => player.gamePlayerId === gamePlayerId);
    const rosteredDefault = playerFor(defaultResult, rosteredPlayer.playerId);
    assert.ok(rosteredDefault);
    assert.equal(defaultResult.window, "14d");
    assert.deepEqual(new Set(defaultResult.players.map(({ gamePlayerId }) => gamePlayerId)), new Set(players.map(({ playerId }) => playerId)));
    assert.equal(rosteredDefault.distinctEvents, 1);
    assert.deepEqual(rosteredDefault.unitTypes.map(({ unitType }) => unitType), ["ARTILLERY", "REGULAR", "RIFLES"]);

    const regular = rosteredDefault.unitTypes.find(({ unitType }) => unitType === "REGULAR");
    assert.ok(regular);
    assert.deepEqual(regular.totals, { kills: 14, deaths: 4, assists: 6 });
    assert.deepEqual(regular.averagesPerAuditAppearance, { kills: 7, deaths: 2, assists: 3 });
    assert.equal(regular.killDeathRatio.value, 3.5);
    assert.equal(regular.killAssistDeathRatio.value, 5);

    const rifles = rosteredDefault.unitTypes.find(({ unitType }) => unitType === "RIFLES");
    assert.ok(rifles);
    assert.equal(rifles.killDeathRatio.state, "ZERO_DENOMINATOR");
    assert.equal(rifles.killDeathRatio.denominator, 0);
    assert.equal(rifles.killDeathRatio.display, "5 K");
    assert.equal(rifles.killAssistDeathRatio.display, "6 K+A");

    const artillery = rosteredDefault.unitTypes.find(({ unitType }) => unitType === "ARTILLERY");
    assert.ok(artillery);
    assert.deepEqual(artillery.totals, { kills: 3, deaths: 0, assists: 0 });
    assert.equal(rosteredDefault.unitTypes.some(({ unitType }) => unitType === "CAVALRY"), false);
    assert.equal(playerFor(thirtyDayResult, rosteredPlayer.playerId)?.distinctEvents, 2);
    assert.equal(playerFor(allTimeResult, rosteredPlayer.playerId)?.unitTypes.some(({ unitType }) => unitType === "CAVALRY"), true);
    assert.equal(JSON.stringify(defaultResult).includes(primaryUnit.commanderUserId), false);
    assert.deepEqual(sourceAfterRead, sourceSnapshot);
  } finally {
    const atomicIds = atomicUnits.map(({ id }) => id);
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER audit_player_result_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER audit_role_assignment_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "Audit" DISABLE TRIGGER audit_final_immutability');
    try {
      await prisma.auditPlayerResult.deleteMany({ where: { audit: { atomicEventUnitId: { in: atomicIds } } } });
      await prisma.auditRoleAssignment.deleteMany({ where: { audit: { atomicEventUnitId: { in: atomicIds } } } });
      await prisma.audit.deleteMany({ where: { atomicEventUnitId: { in: atomicIds } } });
      await prisma.atomicEventUnit.deleteMany({ where: { id: { in: atomicIds } } });
      await prisma.eventParticipation.deleteMany({ where: { id: { in: participations.map(({ id }) => id) } } });
      await prisma.event.deleteMany({ where: { id: { in: events.map(({ id }) => id) } } });
      await prisma.unitMembership.deleteMany({ where: { playerId: { in: players.map(({ id }) => id) } } });
      await prisma.player.deleteMany({ where: { id: { in: players.map(({ id }) => id) } } });
      if (createdOtherUnitId !== null) {
        await prisma.$transaction(async (transaction) => {
          await transaction.authorizedUserMembership.deleteMany({ where: { unitId: createdOtherUnitId! } });
          await transaction.unit.delete({ where: { id: createdOtherUnitId! } });
        });
      }
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "Audit" ENABLE TRIGGER audit_final_immutability');
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER audit_role_assignment_final_immutability');
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER audit_player_result_final_immutability');
      await cleanupRankerTestData();
    }
  }
});
