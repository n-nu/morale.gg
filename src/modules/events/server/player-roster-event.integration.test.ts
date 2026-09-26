import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import { getCurrentRoster, getPlayer, getPlayerMemberships } from "@/modules/players/server/queries";
import { playerWorkflows } from "@/modules/players/server/workflows";
import { canManageRoster, canRequestEventParticipation } from "@/modules/units/server/authorization";

import {
  authorizeEventUser,
  canManageEvent,
  canManageEventAuthorizedUsers,
  revokeEventUser,
} from "./authorization";
import {
  approveEventParticipation,
  denyEventParticipation,
  requestEventParticipation,
} from "./event-participation";
import {
  authorizeEventUserByEmail,
  getEventManagementView,
  updateEventDetails,
} from "./management";
import { listApprovedEventUnits } from "./queries";

test("Player roster and Event participation integrate through their real authorization boundaries", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");

  const suffix = randomUUID();
  const createdUserIds: string[] = [];
  const createdGrantIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdAuthorizedMembershipIds: string[] = [];
  let createdPlayerId: string | null = null;

  try {
    const unit = await prisma.unit.findFirst({
      where: { parentId: null, rootUnitId: { not: null } },
      select: { id: true, name: true, commanderUserId: true },
    });
    assert.ok(unit, "a seeded root Unit is required; run the documented database seed");

    const ownerMembership = await prisma.authorizedUserMembership.findUnique({
      where: { userId_unitId: { userId: unit.commanderUserId, unitId: unit.id } },
      select: { id: true },
    });
    assert.ok(ownerMembership, "the root Unit commander membership is required");

    for (const permission of ["MANAGE_ROSTER", "REQUEST_EVENT_PARTICIPATION"] as const) {
      const grant = await prisma.permissionGrant.create({
        data: {
          authorizedUserMembershipId: ownerMembership.id,
          permission,
          scope: "SELF",
          createdByUserId: unit.commanderUserId,
        },
        select: { id: true },
      });
      createdGrantIds.push(grant.id);
    }

    const manager = await prisma.user.create({
      data: { email: `event-manager-${suffix}@example.invalid`, name: "Integration Manager" },
      select: { id: true },
    });
    createdUserIds.push(manager.id);
    const unauthorized = await prisma.user.create({
      data: { email: `unauthorized-${suffix}@example.invalid`, name: "Unauthorized User" },
      select: { id: true },
    });
    createdUserIds.push(unauthorized.id);
    const requesterMembership = await prisma.authorizedUserMembership.create({
      data: {
        userId: unauthorized.id,
        unitId: unit.id,
        authorityLevel: 1,
        createdByUserId: unit.commanderUserId,
      },
      select: { id: true },
    });
    createdAuthorizedMembershipIds.push(requesterMembership.id);
    const requesterGrant = await prisma.permissionGrant.create({
      data: {
        authorizedUserMembershipId: requesterMembership.id,
        permission: "REQUEST_EVENT_PARTICIPATION",
        scope: "SELF",
        createdByUserId: unit.commanderUserId,
      },
      select: { id: true },
    });
    createdGrantIds.push(requesterGrant.id);

    const authorizedPlayerWorkflows = playerWorkflows({
      db: prisma,
      getUserId: async () => unit.commanderUserId,
      authorize: canManageRoster,
    });
    const player = await authorizedPlayerWorkflows.registerPlayer({
      playerId: `integration-${suffix}`,
      name: "Integration Player",
    });
    createdPlayerId = player.id;

    const membership = await authorizedPlayerWorkflows.addMembership({
      playerId: player.id,
      unitId: unit.id,
    });
    assert.equal((await getCurrentRoster(unit.id)).some((entry) => entry.id === membership.id), true);

    const unauthorizedPlayerWorkflows = playerWorkflows({
      db: prisma,
      getUserId: async () => unauthorized.id,
      authorize: canManageRoster,
    });
    await assert.rejects(
      unauthorizedPlayerWorkflows.endMembership({ membershipId: membership.id, unitId: unit.id }),
      /permission/i,
    );
    assert.equal((await getCurrentRoster(unit.id)).some((entry) => entry.id === membership.id), true);

    const firstEvent = await prisma.event.create({
      data: {
        name: `Integration approval ${suffix}`,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        eventType: "internal",
        ownerUserId: unit.commanderUserId,
      },
      select: { id: true },
    });
    createdEventIds.push(firstEvent.id);
    const deniedEvent = await prisma.event.create({
      data: {
        name: `Integration denial ${suffix}`,
        scheduledAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        eventType: "internal",
        ownerUserId: unit.commanderUserId,
      },
      select: { id: true },
    });
    createdEventIds.push(deniedEvent.id);

    await authorizeEventUserByEmail(
      unit.commanderUserId,
      firstEvent.id,
      `event-manager-${suffix}@example.invalid`,
    );
    assert.equal(await canManageEvent(unit.commanderUserId, firstEvent.id), true);
    assert.equal(await canManageEvent(manager.id, firstEvent.id), true);
    assert.equal(await canManageEventAuthorizedUsers(unit.commanderUserId, firstEvent.id), true);
    assert.equal(await canManageEventAuthorizedUsers(manager.id, firstEvent.id), false);
    await assert.rejects(
      authorizeEventUser(manager.id, firstEvent.id, unauthorized.id),
      /only the Event owner/i,
    );
    await assert.rejects(
      revokeEventUser(manager.id, firstEvent.id, manager.id),
      /only the Event owner/i,
    );

    const updatedEvent = await updateEventDetails(manager.id, firstEvent.id, {
      name: `Manager updated ${suffix}`,
      scheduledAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      eventType: "internal",
    });
    assert.equal(updatedEvent.name, `Manager updated ${suffix}`);

    const requested = await requestEventParticipation({
      userId: unit.commanderUserId,
      eventId: firstEvent.id,
      unitId: unit.id,
    });
    assert.equal(requested.status, "REQUESTED");
    assert.equal(await canRequestEventParticipation(unit.commanderUserId, unit.id), true);

    const managerView = await getEventManagementView(manager.id, firstEvent.id);
    assert.equal(managerView?.participations.find((entry) => entry.id === requested.id)?.status, "REQUESTED");
    const approved = await approveEventParticipation(manager.id, requested.id);
    assert.equal(approved.status, "APPROVED");

    const deniedRequest = await requestEventParticipation({
      userId: unauthorized.id,
      eventId: deniedEvent.id,
      unitId: unit.id,
    });
    assert.equal(await canRequestEventParticipation(unauthorized.id, unit.id), true);
    assert.equal(await canManageEvent(unauthorized.id, deniedEvent.id), false);
    assert.equal((await denyEventParticipation(unit.commanderUserId, deniedRequest.id)).status, "DENIED");
    assert.deepEqual(await listApprovedEventUnits(firstEvent.id), [
      { unitId: unit.id, unitName: unit.name },
    ]);
    assert.deepEqual(await listApprovedEventUnits(deniedEvent.id), []);

    await revokeEventUser(unit.commanderUserId, firstEvent.id, manager.id);
    assert.equal(await canManageEvent(manager.id, firstEvent.id), false);

    await authorizedPlayerWorkflows.endMembership({ membershipId: membership.id, unitId: unit.id });
    assert.ok(await getPlayer(player.id));
    assert.ok((await getPlayerMemberships(player.id)).some((entry) => entry.id === membership.id && entry.endedAt));
    assert.equal((await getCurrentRoster(unit.id)).some((entry) => entry.id === membership.id), false);
    assert.equal((await prisma.eventParticipation.findUnique({ where: { id: approved.id } }))?.status, "APPROVED");
    assert.deepEqual(await listApprovedEventUnits(firstEvent.id), [
      { unitId: unit.id, unitName: unit.name },
    ]);
  } finally {
    if (createdEventIds.length > 0) {
      await prisma.eventParticipation.deleteMany({ where: { eventId: { in: createdEventIds } } });
      await prisma.eventAuthorizedUser.deleteMany({ where: { eventId: { in: createdEventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    if (createdPlayerId !== null) {
      await prisma.unitMembership.deleteMany({ where: { playerId: createdPlayerId } });
      await prisma.player.deleteMany({ where: { id: createdPlayerId } });
    }
    if (createdGrantIds.length > 0) {
      await prisma.permissionGrant.deleteMany({ where: { id: { in: createdGrantIds } } });
    }
    if (createdAuthorizedMembershipIds.length > 0) {
      await prisma.authorizedUserMembership.deleteMany({
        where: { id: { in: createdAuthorizedMembershipIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  }
});