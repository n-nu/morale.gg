import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  authorizeEventUser,
  canManageEvent,
  canManageEventAuthorizedUsers,
  revokeEventUser,
} from "./authorization";

const ownerId = "event-owner";
const managerId = "event-manager";
const unrelatedId = "unrelated-user";
const creatorOnlyId = "manage-events-user";
const eventId = "event-1";

const users = new Set([ownerId, managerId, unrelatedId, creatorOnlyId]);
const authorizations = new Map<string, { id: string; eventId: string; userId: string; addedByUserId: string; createdAt: Date; updatedAt: Date }>();

const originalDelegates = {
  userFindUnique: prisma.user.findUnique,
  eventFindUnique: prisma.event.findUnique,
  authorizationFindUnique: prisma.eventAuthorizedUser.findUnique,
  authorizationCreate: prisma.eventAuthorizedUser.create,
  authorizationDelete: prisma.eventAuthorizedUser.delete,
};

function authorizationKey(targetEventId: string, userId: string) {
  return `${targetEventId}:${userId}`;
}

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
      authorizations.get(authorizationKey(where.eventId_userId.eventId, where.eventId_userId.userId)) ?? null,
  });
  Object.defineProperty(prisma.eventAuthorizedUser, "create", {
    configurable: true,
    value: async ({ data }: { data: { eventId: string; userId: string; addedByUserId: string } }) => {
      const key = authorizationKey(data.eventId, data.userId);
      if (authorizations.has(key)) throw new Error("Unique constraint failed");
      const record = { id: `authorization-${data.userId}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      authorizations.set(key, record);
      return record;
    },
  });
  Object.defineProperty(prisma.eventAuthorizedUser, "delete", {
    configurable: true,
    value: async ({ where }: { where: { eventId_userId: { eventId: string; userId: string } } }) => {
      const key = authorizationKey(where.eventId_userId.eventId, where.eventId_userId.userId);
      const record = authorizations.get(key);
      if (!record) throw new Error("Record not found");
      authorizations.delete(key);
      return record;
    },
  });
}

test.beforeEach(() => {
  authorizations.clear();
  installScenario();
});

test.after(() => {
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: originalDelegates.userFindUnique });
  Object.defineProperty(prisma.event, "findUnique", { configurable: true, value: originalDelegates.eventFindUnique });
  Object.defineProperty(prisma.eventAuthorizedUser, "findUnique", { configurable: true, value: originalDelegates.authorizationFindUnique });
  Object.defineProperty(prisma.eventAuthorizedUser, "create", { configurable: true, value: originalDelegates.authorizationCreate });
  Object.defineProperty(prisma.eventAuthorizedUser, "delete", { configurable: true, value: originalDelegates.authorizationDelete });
});

test("allows only the owner or an explicitly authorized User to manage an Event", async () => {
  assert.equal(await canManageEvent(ownerId, eventId), true);
  assert.equal(await canManageEvent(managerId, eventId), false);

  await authorizeEventUser(ownerId, eventId, managerId);
  assert.equal(await canManageEvent(managerId, eventId), true);
  assert.equal(await canManageEvent(unrelatedId, eventId), false);
  assert.equal(await canManageEvent(creatorOnlyId, eventId), false);
});

test("fails closed for missing Users, Events, and identifiers", async () => {
  assert.equal(await canManageEvent("", eventId), false);
  assert.equal(await canManageEvent("missing-user", eventId), false);
  assert.equal(await canManageEvent(ownerId, "missing-event"), false);
  assert.equal(await canManageEventAuthorizedUsers(managerId, eventId), false);
});

test("allows only the owner to add and revoke Event managers", async () => {
  assert.equal(await canManageEventAuthorizedUsers(ownerId, eventId), true);
  assert.equal(await canManageEventAuthorizedUsers(managerId, eventId), false);

  await assert.rejects(
    () => authorizeEventUser(managerId, eventId, unrelatedId),
    /only the Event owner/i,
  );

  await authorizeEventUser(ownerId, eventId, managerId);
  await assert.rejects(
    () => revokeEventUser(managerId, eventId, managerId),
    /only the Event owner/i,
  );

  await revokeEventUser(ownerId, eventId, managerId);
  assert.equal(await canManageEvent(managerId, eventId), false);
});

test("rejects duplicate authorization and explicit authorization of the owner", async () => {
  await authorizeEventUser(ownerId, eventId, managerId);
  await assert.rejects(
    () => authorizeEventUser(ownerId, eventId, managerId),
    /already authorized/i,
  );
  await assert.rejects(
    () => authorizeEventUser(ownerId, eventId, ownerId),
    /already authorized through ownership/i,
  );
});

test("preserves uniqueness during concurrent manager authorization", async () => {
  const results = await Promise.allSettled([
    authorizeEventUser(ownerId, eventId, managerId),
    authorizeEventUser(ownerId, eventId, managerId),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});