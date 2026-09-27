import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  attachAtomicEventUnit,
  attachChildEventCommandGroup,
  createEventCommandGroup,
  deleteEventCommandGroup,
  detachAtomicEventUnit,
  getPublicEventCommandStructure,
  getUniqueDescendantAtomicUnits,
  reparentEventCommandGroup,
  updateEventCommandGroup,
} from "./command-groups";

test("Event command groups enforce authority and preserve a strict historical tree", async (t) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  const suffix = randomUUID();
  const representedUnit = await prisma.unit.findFirst({
    where: { rootUnitId: { not: null } },
    select: { id: true, parentId: true, commanderUserId: true },
  });
  assert.ok(representedUnit, "a seeded Unit is required; run the documented database seed");
  const alternateRepresentedUnit = await prisma.unit.findFirst({
    where: { id: { not: representedUnit.id } },
    select: { id: true },
  });

  const owner = await prisma.user.create({
    data: { email: `command-owner-${suffix}@example.test`, name: "Command owner" },
    select: { id: true },
  });
  const manager = await prisma.user.create({
    data: { email: `command-manager-${suffix}@example.test`, name: "Command manager" },
    select: { id: true },
  });
  const commanderPlayer = await prisma.player.create({
    data: { playerId: `group-commander-${suffix}`, name: null },
    select: { id: true, playerId: true },
  });
  const secondPlayer = await prisma.player.create({
    data: { playerId: `group-player-${suffix}`, name: null },
    select: { id: true, playerId: true },
  });
  const event = await prisma.event.create({
    data: {
      name: `Command tree ${suffix}`,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      eventType: "integration",
      ownerUserId: owner.id,
    },
    select: { id: true },
  });
  const otherEvent = await prisma.event.create({
    data: {
      name: `Other command tree ${suffix}`,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      eventType: "integration",
      ownerUserId: owner.id,
    },
    select: { id: true },
  });
  await prisma.eventAuthorizedUser.create({
    data: { eventId: event.id, userId: manager.id, addedByUserId: owner.id },
  });
  const [participation, otherParticipation] = await Promise.all([
    prisma.eventParticipation.create({
      data: { eventId: event.id, unitId: representedUnit.id, status: "APPROVED" },
      select: { id: true },
    }),
    prisma.eventParticipation.create({
      data: { eventId: otherEvent.id, unitId: representedUnit.id, status: "APPROVED" },
      select: { id: true },
    }),
  ]);
  const atomicUnits = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      prisma.atomicEventUnit.create({
        data: { eventParticipationId: participation.id, isMandatory: index < 2 },
        select: { id: true },
      }),
    ),
  );
  const foreignAtomicUnit = await prisma.atomicEventUnit.create({
    data: { eventParticipationId: otherParticipation.id, isMandatory: true },
    select: { id: true },
  });
  const membership = await prisma.unitMembership.create({
    data: { playerId: commanderPlayer.id, unitId: representedUnit.id },
    select: { id: true, playerId: true, unitId: true, startedAt: true, endedAt: true },
  });
  const groupIds: string[] = [];
  const atomicIds = [...atomicUnits.map(({ id }) => id), foreignAtomicUnit.id];

  const createGroup = (userId: string, eventId: string, name: string) =>
    createEventCommandGroup(userId, eventId, {
      name,
      representedUnitId: representedUnit.id,
      commanderPlayerId: commanderPlayer.id,
    });

  try {
    await t.test("owner and explicit Event manager are authorized; Unit status is not", async () => {
      const corps = await createGroup(owner.id, event.id, "Corps");
      groupIds.push(corps.id);
      assert.equal(corps.commanderPlayerId, commanderPlayer.id);
      assert.notEqual(corps.commanderPlayerId, owner.id);

      const renamed = await updateEventCommandGroup(manager.id, corps.id, {
        name: "Field Corps",
        representedUnitId: alternateRepresentedUnit?.id ?? representedUnit.id,
        commanderPlayerId: secondPlayer.id,
      });
      assert.equal(renamed.name, "Field Corps");
      assert.equal(renamed.representedUnitId, alternateRepresentedUnit?.id ?? representedUnit.id);
      assert.equal(renamed.commanderPlayerId, secondPlayer.id);

      await assert.rejects(
        () => createGroup(representedUnit.commanderUserId, event.id, "Unauthorized group"),
        /unauthorized/i,
      );
      await assert.rejects(
        () => createGroup("missing-user", event.id, "Unauthorized group"),
        /unauthorized/i,
      );
    });

    const corps = await prisma.eventCommandGroup.findFirstOrThrow({ where: { eventId: event.id, name: "Field Corps" } });
    const regimentA = await createGroup(owner.id, event.id, "Regiment A");
    const regimentB = await createGroup(manager.id, event.id, "Regiment B");
    const alternateRoot = await createGroup(manager.id, event.id, "Alternate command");
    const foreignRoot = await createGroup(owner.id, otherEvent.id, "Foreign group");
    groupIds.push(regimentA.id, regimentB.id, alternateRoot.id, foreignRoot.id);

    await t.test("atomic and child membership rejects duplicate parents and cross-Event edges", async () => {
      await attachChildEventCommandGroup(manager.id, corps.id, regimentA.id);
      await attachChildEventCommandGroup(manager.id, corps.id, regimentB.id);
      await assert.rejects(
        () => attachChildEventCommandGroup(manager.id, regimentB.id, regimentA.id),
        /already has a parent/i,
      );
      await assert.rejects(
        () => attachChildEventCommandGroup(owner.id, regimentA.id, foreignRoot.id),
        /same Event/i,
      );

      await attachAtomicEventUnit(manager.id, regimentA.id, atomicUnits[0].id);
      await assert.rejects(
        () => attachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[0].id),
        /already has a parent/i,
      );
      await attachAtomicEventUnit(manager.id, regimentA.id, atomicUnits[1].id);
      await attachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[2].id);
      await attachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[3].id);
      await assert.rejects(
        () => attachAtomicEventUnit(owner.id, regimentA.id, foreignAtomicUnit.id),
        /same Event/i,
      );
      await assert.rejects(
        () => detachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[0].id),
        /not a direct child/i,
      );
      await detachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[3].id);
      await attachAtomicEventUnit(manager.id, regimentB.id, atomicUnits[3].id);
    });

    await t.test("self-parenting and cycles fail; safe reparenting succeeds", async () => {
      await assert.rejects(
        () => reparentEventCommandGroup(manager.id, regimentA.id, regimentA.id),
        /cannot parent itself/i,
      );
      await assert.rejects(
        () => reparentEventCommandGroup(manager.id, corps.id, regimentA.id),
        /cannot parent itself or one of its ancestors/i,
      );

      const moved = await reparentEventCommandGroup(manager.id, regimentA.id, alternateRoot.id);
      assert.equal(moved.parentGroupId, alternateRoot.id);
      const movedBack = await reparentEventCommandGroup(manager.id, regimentA.id, corps.id);
      assert.equal(movedBack.parentGroupId, corps.id);
      const detached = await reparentEventCommandGroup(manager.id, regimentB.id, null);
      assert.equal(detached.parentGroupId, null);
      const reattached = await attachChildEventCommandGroup(manager.id, corps.id, regimentB.id);
      assert.equal(reattached.parentGroupId, corps.id);
    });

    const unitTypes = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;
    for (const [index, atomicUnit] of atomicUnits.entries()) {
      const audit = await prisma.audit.create({
        data: {
          atomicEventUnitId: atomicUnit.id,
          createdByUserId: owner.id,
          lifecycle: "DRAFT",
          unitType: unitTypes[index],
          tickets: index + 1,
          flagCaptures: 0,
          flagLosses: 0,
          stars: 1,
        },
        select: { id: true },
      });
      await prisma.auditPlayerResult.create({
        data: { auditId: audit.id, playerId: commanderPlayer.id, kills: index, deaths: 0, assists: 1 },
      });
      await prisma.auditRoleAssignment.create({
        data: { auditId: audit.id, playerId: commanderPlayer.id, role: "COMMANDER" },
      });
      if (unitTypes[index] === "REGULAR") {
        await prisma.auditRoleAssignment.create({
          data: { auditId: audit.id, playerId: commanderPlayer.id, role: "FLAG_BEARER" },
        });
      }
      await prisma.audit.update({ where: { id: audit.id }, data: { lifecycle: "FINAL", submittedAt: new Date() } });
    }

    await t.test("public tree and flattening expose four unique mixed-type atomic units", async () => {
      const flattened = await getUniqueDescendantAtomicUnits(corps.id);
      assert.equal(flattened.length, 4);
      assert.equal(new Set(flattened.map(({ id }) => id)).size, 4);
      assert.deepEqual(new Set(flattened.map(({ unitType }) => unitType)), new Set(unitTypes));
      assert.equal(flattened.filter(({ unitType }) => unitType !== null).length, 4);

      const exactTwo = await getUniqueDescendantAtomicUnits(regimentA.id);
      assert.equal(exactTwo.length, 2);
      assert.equal(new Set(exactTwo.map(({ id }) => id)).size, 2);

      const structure = await getPublicEventCommandStructure(event.id);
      assert.ok(structure);
      assert.equal(structure.groups.find(({ id }) => id === corps.id)?.children.length, 2);
      assert.equal(structure.groups.find(({ id }) => id === corps.id)?.commanderPlayerId, secondPlayer.playerId);
      assert.equal(JSON.stringify(structure).includes(owner.id), false);
      assert.equal(JSON.stringify(structure).includes("authorizedUsers"), false);
      assert.deepEqual(structure.ungroupedAtomicUnits.map(({ id }) => id), []);
    });

    await t.test("deleting groups preserves atomic units, finalized history, hierarchy, and roster", async () => {
      const beforeAtomic = await prisma.atomicEventUnit.findMany({
        where: { id: { in: atomicUnits.map(({ id }) => id) } },
        orderBy: { id: "asc" },
      });
      const beforeAudits = await prisma.audit.findMany({
        where: { atomicEventUnitId: { in: atomicUnits.map(({ id }) => id) } },
        include: { playerResults: true, roles: true },
        orderBy: { atomicEventUnitId: "asc" },
      });
      const beforeUnitHierarchy = await prisma.unit.findMany({ select: { id: true, parentId: true }, orderBy: { id: "asc" } });
      const beforeMembership = await prisma.unitMembership.findUnique({ where: { id: membership.id } });

      await deleteEventCommandGroup(manager.id, corps.id);
      assert.equal(await prisma.eventCommandGroup.findUnique({ where: { id: corps.id } }), null);
      assert.equal((await prisma.eventCommandGroup.findUnique({ where: { id: regimentA.id } }))?.parentGroupId, null);
      assert.equal((await prisma.eventCommandGroup.findUnique({ where: { id: regimentB.id } }))?.parentGroupId, null);
      await deleteEventCommandGroup(manager.id, regimentA.id);

      const afterAtomic = await prisma.atomicEventUnit.findMany({
        where: { id: { in: atomicUnits.map(({ id }) => id) } },
        orderBy: { id: "asc" },
      });
      const afterAudits = await prisma.audit.findMany({
        where: { atomicEventUnitId: { in: atomicUnits.map(({ id }) => id) } },
        include: { playerResults: true, roles: true },
        orderBy: { atomicEventUnitId: "asc" },
      });
      const afterUnitHierarchy = await prisma.unit.findMany({ select: { id: true, parentId: true }, orderBy: { id: "asc" } });
      const afterMembership = await prisma.unitMembership.findUnique({ where: { id: membership.id } });

      assert.deepEqual(afterAtomic, beforeAtomic);
      assert.deepEqual(afterAudits, beforeAudits);
      assert.deepEqual(afterUnitHierarchy, beforeUnitHierarchy);
      assert.deepEqual(afterMembership, beforeMembership);
      assert.equal(afterAudits.length, 4);
      assert.equal(afterAudits.reduce((count, audit) => count + audit.playerResults.length, 0), 4);
      assert.equal(afterAudits.reduce((count, audit) => count + audit.roles.length, 0), 5);
      assert.equal(await prisma.eventCommandGroupAtomicUnit.count({ where: { atomicEventUnitId: { in: atomicUnits.map(({ id }) => id) } } }), 2);
      assert.equal(await prisma.eventCommandGroupAtomicUnit.count({ where: { atomicEventUnitId: atomicUnits[0].id } }), 0);
    });
  } finally {
    const eventIds = [event.id, otherEvent.id];
    await prisma.eventCommandGroupAtomicUnit.deleteMany({ where: { group: { eventId: { in: eventIds } } } });
    await prisma.eventCommandGroup.updateMany({ where: { eventId: { in: eventIds } }, data: { parentGroupId: null } });
    await prisma.eventCommandGroup.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER audit_player_result_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER audit_role_assignment_final_immutability');
    await prisma.$executeRawUnsafe('ALTER TABLE "Audit" DISABLE TRIGGER audit_final_immutability');
    try {
      await prisma.auditPlayerResult.deleteMany({ where: { audit: { atomicEventUnitId: { in: atomicIds } } } });
      await prisma.auditRoleAssignment.deleteMany({ where: { audit: { atomicEventUnitId: { in: atomicIds } } } });
      await prisma.audit.deleteMany({ where: { atomicEventUnitId: { in: atomicIds } } });
      await prisma.eventCommandGroup.deleteMany({ where: { id: { in: groupIds }, parentGroupId: null } });
      await prisma.atomicEventUnit.deleteMany({ where: { id: { in: atomicIds } } });
      await prisma.eventParticipation.deleteMany({ where: { id: { in: [participation.id, otherParticipation.id] } } });
      await prisma.eventAuthorizedUser.deleteMany({ where: { eventId: event.id } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      await prisma.unitMembership.deleteMany({ where: { id: membership.id } });
      await prisma.player.deleteMany({ where: { id: { in: [commanderPlayer.id, secondPlayer.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, manager.id] } } });
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "Audit" ENABLE TRIGGER audit_final_immutability');
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER audit_role_assignment_final_immutability');
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER audit_player_result_final_immutability');
    }
  }
});