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
    assert.equal(attackerAtomic.side, "ATTACKER");
    assert.equal(attackerAtomic.eventParticipationId, participation.id);

    const defenderGroup = await createEventCommandGroup(owner.id, event.id, { name: "Defender group", participationId: participation.id, side: "DEFENDER", commanderPlayerId: commander.id });
    const attackerGroup = await createEventCommandGroup(owner.id, event.id, { name: "Attacker group", participationId: participation.id, side: "ATTACKER", commanderPlayerId: commander.id });

    await assert.rejects(
      () => attachAtomicEventUnit(manager.id, defenderGroup.id, attackerAtomic.id),
      /same battlefield side/i,
    );
    await attachAtomicEventUnit(manager.id, defenderGroup.id, defenderAtomic.id);
    await assert.rejects(
      () => attachChildEventCommandGroup(manager.id, defenderGroup.id, attackerGroup.id),
      /same battlefield side/i,
    );
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
