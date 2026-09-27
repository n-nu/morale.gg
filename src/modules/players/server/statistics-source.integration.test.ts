import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getMembershipPeriodAtEventTime, isMembershipActiveAt } from "./statistics-source";

test("Players resolves game Player IDs to internal membership keys and evaluates historical Unit scope", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  const suffix = randomUUID();
  const primaryUnit = await prisma.unit.findFirst({
    where: { rootUnitId: { not: null } },
    select: { id: true, rootUnitId: true, commanderUserId: true },
  });
  assert.ok(primaryUnit, "a seeded Unit is required; run the documented database seed");

  let createdUnitId: string | null = null;
  let secondaryUnit = await prisma.unit.findFirst({
    where: { id: { not: primaryUnit.id } },
    select: { id: true },
  });
  if (secondaryUnit === null) {
    const created = await prisma.$transaction(async (transaction) => {
      const unit = await transaction.unit.create({
        data: {
          name: `Membership identity test ${suffix}`,
          parentId: primaryUnit.id,
          rootUnitId: primaryUnit.rootUnitId,
          commanderUserId: primaryUnit.commanderUserId,
        },
        select: { id: true },
      });
      await transaction.authorizedUserMembership.create({
        data: {
          userId: primaryUnit.commanderUserId,
          unitId: unit.id,
          authorityLevel: 0,
          createdByUserId: primaryUnit.commanderUserId,
        },
      });
      return unit;
    });
    createdUnitId = created.id;
    secondaryUnit = created;
  }

  const players: Array<{ id: string; playerId: string }> = [];
  try {
    for (const label of ["active", "joined-after", "ended-before", "rejoined"]) {
      players.push(await prisma.player.create({
        data: { playerId: `membership-${label}-${suffix}` },
        select: { id: true, playerId: true },
      }));
    }

    const [active, joinedAfter, endedBefore, rejoined] = players;
    const eventTime = new Date(Date.now() - 60_000);
    const day = 24 * 60 * 60 * 1000;
    const activeMembership = await prisma.unitMembership.create({
      data: {
        playerId: active.id,
        unitId: primaryUnit.id,
        startedAt: new Date(eventTime.getTime() - day),
        endedAt: new Date(eventTime.getTime() + day),
      },
      select: { id: true, playerId: true },
    });
    await prisma.unitMembership.create({
      data: {
        playerId: active.id,
        unitId: primaryUnit.id,
        startedAt: new Date(eventTime.getTime() + 2 * day),
      },
    });
    await prisma.unitMembership.create({
      data: {
        playerId: joinedAfter.id,
        unitId: primaryUnit.id,
        startedAt: new Date(eventTime.getTime() + day),
      },
    });
    await prisma.unitMembership.create({
      data: {
        playerId: endedBefore.id,
        unitId: primaryUnit.id,
        startedAt: new Date(eventTime.getTime() - 2 * day),
        endedAt: new Date(eventTime.getTime() - 1),
      },
    });
    await prisma.unitMembership.createMany({
      data: [primaryUnit.id, secondaryUnit.id].map((unitId) => ({
        playerId: rejoined.id,
        unitId,
        startedAt: new Date(eventTime.getTime() - day),
        endedAt: new Date(eventTime.getTime() + day),
      })),
    });

    assert.notEqual(active.id, active.playerId);
    assert.equal(activeMembership.playerId, active.id);

    const activePeriod = await getMembershipPeriodAtEventTime(active.playerId, primaryUnit.id, eventTime);
    assert.equal(activePeriod?.id, activeMembership.id);
    assert.equal(activePeriod?.unitId, primaryUnit.id);
    assert.equal("playerId" in (activePeriod ?? {}), false);
    assert.equal(await isMembershipActiveAt(active.playerId, primaryUnit.id, eventTime), true);
    assert.equal(await isMembershipActiveAt(joinedAfter.playerId, primaryUnit.id, eventTime), false);
    assert.equal(await isMembershipActiveAt(endedBefore.playerId, primaryUnit.id, eventTime), false);
    assert.equal(await isMembershipActiveAt(rejoined.playerId, primaryUnit.id, eventTime), true);
    assert.equal(await isMembershipActiveAt(rejoined.playerId, secondaryUnit.id, eventTime), true);
    assert.equal(await isMembershipActiveAt(rejoined.playerId, "unrelated-unit", eventTime), false);
    assert.equal(await isMembershipActiveAt(`unknown-${suffix}`, primaryUnit.id, eventTime), false);
  } finally {
    const internalPlayerIds = players.map(({ id }) => id);
    await prisma.unitMembership.deleteMany({ where: { playerId: { in: internalPlayerIds } } });
    await prisma.player.deleteMany({ where: { id: { in: internalPlayerIds } } });
    if (createdUnitId !== null) {
      await prisma.$transaction(async (transaction) => {
        await transaction.authorizedUserMembership.deleteMany({ where: { unitId: createdUnitId! } });
        await transaction.unit.delete({ where: { id: createdUnitId! } });
      });
    }
  }
});