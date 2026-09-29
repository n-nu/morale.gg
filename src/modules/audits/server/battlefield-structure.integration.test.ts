import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  createEventAtomicEventUnit,
} from "./atomic-units";
import {
  attachAtomicEventUnit,
  attachChildEventCommandGroup,
  createEventCommandGroup,
  getManagerEventCommandStructure,
  getPublicEventCommandStructure,
  moveEventBattlefieldNode,
} from "./command-groups";

test("Event managers create approved atomic claims and server-side side checks protect the tree", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");
  const suffix = randomUUID();
  const representedUnit = await prisma.unit.findFirst({
    where: { parentId: null, rootUnitId: { not: null } },
    select: { id: true },
  });
  assert.ok(representedUnit, "a seeded Unit is required; run the documented database seed");
  const owner = await prisma.user.create({ data: { email: `battle-owner-${suffix}@example.test`, name: "Battle owner" }, select: { id: true } });
  const manager = await prisma.user.create({ data: { email: `battle-manager-${suffix}@example.test`, name: "Battle manager" }, select: { id: true } });
  const commander = await prisma.player.create({ data: { playerId: `battle-commander-${suffix}`, name: null }, select: { id: true } });
  const event = await prisma.event.create({
    data: { name: `Battle structure ${suffix}`, scheduledAt: new Date(Date.now() + 60_000), eventType: "integration", ownerUserId: owner.id },
    select: { id: true },
  });
  await prisma.eventAuthorizedUser.create({ data: { eventId: event.id, userId: manager.id, addedByUserId: owner.id } });
  const participation = await prisma.eventParticipation.create({ data: { eventId: event.id, unitId: representedUnit.id, status: "APPROVED" }, select: { id: true } });

  try {
    const attackerAtomic = await createEventAtomicEventUnit({ userId: manager.id, eventId: event.id, participationId: participation.id, name: "Attacker line", side: "ATTACKER", auditUnitType: "REGULAR", isMandatory: true });
    const defenderAtomic = await createEventAtomicEventUnit({ userId: manager.id, eventId: event.id, participationId: participation.id, name: "Defender line", side: "DEFENDER", auditUnitType: "RIFLES", isMandatory: false });
    const unsortedAtomic = await createEventAtomicEventUnit({ userId: manager.id, eventId: event.id, participationId: participation.id, name: "Unsorted line", side: null, auditUnitType: "CAVALRY", isMandatory: true });
    assert.equal(attackerAtomic.side, "ATTACKER");
    assert.equal(attackerAtomic.eventParticipationId, participation.id);
    assert.equal(unsortedAtomic.side, null);

    const defenderGroup = await createEventCommandGroup(owner.id, event.id, { name: "Defender group", participationId: participation.id, side: "DEFENDER", commanderPlayerId: commander.id });
    const attackerGroup = await createEventCommandGroup(owner.id, event.id, { name: "Attacker group", participationId: participation.id, side: "ATTACKER", commanderPlayerId: commander.id });
    const unsortedGroup = await createEventCommandGroup(owner.id, event.id, { name: "Unsorted group", participationId: participation.id, commanderPlayerId: commander.id });
    assert.equal(unsortedGroup.side, null);

    await moveEventBattlefieldNode(manager.id, event.id, { type: "atomic", id: attackerAtomic.id }, { groupId: defenderGroup.id });
    assert.equal((await prisma.atomicEventUnit.findUnique({ where: { id: attackerAtomic.id } }))?.side, "DEFENDER");
    await attachAtomicEventUnit(manager.id, defenderGroup.id, defenderAtomic.id);
    await moveEventBattlefieldNode(manager.id, event.id, { type: "atomic", id: attackerAtomic.id }, { groupId: attackerGroup.id });
    await attachChildEventCommandGroup(manager.id, attackerGroup.id, unsortedGroup.id);
    const movedGroup = await attachChildEventCommandGroup(manager.id, defenderGroup.id, attackerGroup.id);
    assert.equal(movedGroup.side, "DEFENDER");
    assert.equal((await prisma.eventCommandGroup.findUnique({ where: { id: unsortedGroup.id } }))?.side, "DEFENDER");
    assert.equal((await prisma.atomicEventUnit.findUnique({ where: { id: attackerAtomic.id } }))?.side, "DEFENDER");

    await moveEventBattlefieldNode(manager.id, event.id, { type: "group", id: attackerGroup.id }, { side: "ATTACKER" });
    assert.equal((await prisma.eventCommandGroup.findUnique({ where: { id: attackerGroup.id } }))?.side, "ATTACKER");
    assert.equal((await prisma.eventCommandGroup.findUnique({ where: { id: unsortedGroup.id } }))?.side, "ATTACKER");
    assert.equal((await prisma.atomicEventUnit.findUnique({ where: { id: attackerAtomic.id } }))?.side, "ATTACKER");
    await moveEventBattlefieldNode(manager.id, event.id, { type: "group", id: attackerGroup.id }, { side: null });
    await moveEventBattlefieldNode(manager.id, event.id, { type: "atomic", id: unsortedAtomic.id }, { side: "ATTACKER" });
    await moveEventBattlefieldNode(manager.id, event.id, { type: "atomic", id: unsortedAtomic.id }, { side: null });

    const publicStructure = await getPublicEventCommandStructure(event.id);
    const managerStructure = await getManagerEventCommandStructure(manager.id, event.id);
    const unauthorizedManagerStructure = await getManagerEventCommandStructure(owner.id, "missing-event");
    assert.ok(publicStructure);
    assert.ok(managerStructure);
    assert.equal(unauthorizedManagerStructure, null);
    assert.equal(publicStructure.groups.some(({ id }) => id === attackerGroup.id), false);
    assert.equal(publicStructure.ungroupedAtomicUnits.some(({ id }) => id === unsortedAtomic.id), false);
    assert.equal(managerStructure.groups.some(({ id }) => id === attackerGroup.id), true);
    assert.equal(managerStructure.ungroupedAtomicUnits.some(({ id }) => id === unsortedAtomic.id), true);
  } finally {
    await prisma.eventCommandGroupAtomicUnit.deleteMany({ where: { group: { eventId: event.id } } });
    await prisma.eventCommandGroup.updateMany({ where: { eventId: event.id }, data: { parentGroupId: null } });
    await prisma.eventCommandGroup.deleteMany({ where: { eventId: event.id } });
    await prisma.atomicEventUnit.deleteMany({ where: { eventParticipation: { eventId: event.id } } });
    await prisma.eventParticipation.deleteMany({ where: { eventId: event.id } });
    await prisma.eventAuthorizedUser.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.player.delete({ where: { id: commander.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, manager.id] } } });
  }
});
