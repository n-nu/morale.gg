import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  approveEventParticipation,
  decideEventParticipation,
  denyEventParticipation,
} from "./event-participation";

const ownerId = "event-owner";
const managerId = "event-manager";
const unrelatedId = "unrelated-user";
const eventId = "event-1";

const users = new Set([ownerId, managerId, unrelatedId]);
const managerAuthorizations = new Set([managerId]);

type ParticipationRecord = {
  id: string;
  eventId: string;
  unitId: string;
  status: "REQUESTED" | "APPROVED" | "DENIED";
  createdAt: Date;
  updatedAt: Date;
};

const participations = new Map<string, ParticipationRecord>();

function seedParticipation(
  id: string,
  status: ParticipationRecord["status"] = "REQUESTED",
) {
  participations.set(id, {
    id,
    eventId,
    unitId: `unit-${id}`,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const originalDelegates = {
  userFindUnique: prisma.user.findUnique,
  eventFindUnique: prisma.event.findUnique,
  authorizationFindUnique: prisma.eventAuthorizedUser.findUnique,
  participationFindUnique: prisma.eventParticipation.findUnique,
  participationFindUniqueOrThrow: prisma.eventParticipation.findUniqueOrThrow,
  participationUpdateMany: prisma.eventParticipation.updateMany,
};

function installScenario() {
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      users.has(where.id) ? { id: where.id } : null,
  });
  Object.defineProperty(prisma.event, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      where.id === eventId ? { ownerUserId: ownerId } : null,
  });
  Object.defineProperty(prisma.eventAuthorizedUser, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { eventId_userId: { eventId: string; userId: string } } }) =>
      where.eventId_userId.eventId === eventId &&
      managerAuthorizations.has(where.eventId_userId.userId)
        ? { id: `authorization-${where.eventId_userId.userId}` }
        : null,
  });
  Object.defineProperty(prisma.eventParticipation, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      participations.get(where.id) ?? null,
  });
  Object.defineProperty(prisma.eventParticipation, "findUniqueOrThrow", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) => {
      const record = participations.get(where.id);
      if (!record) throw new Error("Record not found");
      return record;
    },
  });
  Object.defineProperty(prisma.eventParticipation, "updateMany", {
    configurable: true,
    value: async ({
      where,
      data,
    }: {
      where: { id: string; status: ParticipationRecord["status"] };
      data: { status: ParticipationRecord["status"] };
    }) => {
      const record = participations.get(where.id);
      if (!record || record.status !== where.status) {
        return { count: 0 };
      }
      record.status = data.status;
      record.updatedAt = new Date();
      return { count: 1 };
    },
  });
}

test.beforeEach(() => {
  participations.clear();
  installScenario();
});

test.after(() => {
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: originalDelegates.userFindUnique });
  Object.defineProperty(prisma.event, "findUnique", { configurable: true, value: originalDelegates.eventFindUnique });
  Object.defineProperty(prisma.eventAuthorizedUser, "findUnique", { configurable: true, value: originalDelegates.authorizationFindUnique });
  Object.defineProperty(prisma.eventParticipation, "findUnique", { configurable: true, value: originalDelegates.participationFindUnique });
  Object.defineProperty(prisma.eventParticipation, "findUniqueOrThrow", { configurable: true, value: originalDelegates.participationFindUniqueOrThrow });
  Object.defineProperty(prisma.eventParticipation, "updateMany", { configurable: true, value: originalDelegates.participationUpdateMany });
});

test("lets the owner approve and an explicit manager deny REQUESTED participation", async () => {
  seedParticipation("participation-1");
  seedParticipation("participation-2");

  const approved = await approveEventParticipation(ownerId, "participation-1");
  assert.equal(approved.status, "APPROVED");

  const denied = await denyEventParticipation(managerId, "participation-2");
  assert.equal(denied.status, "DENIED");
});

test("rejects decisions from unauthorized or missing Users", async () => {
  seedParticipation("participation-1");

  await assert.rejects(
    () => approveEventParticipation(unrelatedId, "participation-1"),
    /Unauthorized: user cannot decide participation/i,
  );
  await assert.rejects(
    () => approveEventParticipation("missing-user", "participation-1"),
    /Unauthorized: user cannot decide participation/i,
  );
  await assert.rejects(
    () => approveEventParticipation("", "participation-1"),
    /User is required/i,
  );
  assert.equal(participations.get("participation-1")?.status, "REQUESTED");
});

test("rejects invalid and terminal transitions", async () => {
  seedParticipation("approved-participation", "APPROVED");
  seedParticipation("denied-participation", "DENIED");

  await assert.rejects(
    () => denyEventParticipation(ownerId, "approved-participation"),
    /Invalid event participation transition/i,
  );
  await assert.rejects(
    () => approveEventParticipation(ownerId, "denied-participation"),
    /Invalid event participation transition/i,
  );
  await assert.rejects(
    () =>
      decideEventParticipation({
        userId: ownerId,
        participationId: "approved-participation",
        decision: "APPROVED",
      }),
    /Invalid event participation transition/i,
  );
  await assert.rejects(
    () => approveEventParticipation(ownerId, "missing-participation"),
    /Participation request not found/i,
  );
});

test("fails safely when two decisions race for the same request", async () => {
  seedParticipation("participation-1");

  const first = await approveEventParticipation(ownerId, "participation-1");
  assert.equal(first.status, "APPROVED");

  // A second decision that read REQUESTED before the first commit still fails
  // at the guarded write, not by silently overwriting the terminal state.
  const record = participations.get("participation-1");
  assert.ok(record);
  const guardedWrite = await prisma.eventParticipation.updateMany({
    where: { id: "participation-1", status: "REQUESTED" },
    data: { status: "DENIED" },
  });
  assert.equal(guardedWrite.count, 0);
  assert.equal(record.status, "APPROVED");

  await assert.rejects(
    () => denyEventParticipation(managerId, "participation-1"),
    /Invalid event participation transition/i,
  );
});
