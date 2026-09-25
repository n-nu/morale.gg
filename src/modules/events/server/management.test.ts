import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  authorizeEventUserByEmail,
  listManageableEvents,
  updateEventDetails,
} from "./management";

const ownerId = "event-owner";
const managerId = "event-manager";
const eventId = "event-1";

const knownEmails = new Map<string, string>([
  ["manager@example.com", managerId],
]);

type EventRecord = {
  id: string;
  name: string;
  scheduledAt: Date;
  eventType: string;
  description: string | null;
  opponent: string | null;
  map: string | null;
  ownerUserId: string;
};

const events = new Map<string, EventRecord>();
const authorizations = new Map<string, { id: string; eventId: string; userId: string }>();

function seedEvent(overrides: Partial<EventRecord> = {}) {
  events.set(eventId, {
    id: eventId,
    name: "Battle of the Rhine Crossing",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    eventType: "External",
    description: null,
    opponent: null,
    map: null,
    ownerUserId: ownerId,
    ...overrides,
  });
}

const allowOwnerOnly = async (userId: string) => userId === ownerId;

const originalDelegates = {
  userFindUnique: prisma.user.findUnique,
  eventFindUnique: prisma.event.findUnique,
  eventFindMany: prisma.event.findMany,
  eventUpdate: prisma.event.update,
  authorizationFindUnique: prisma.eventAuthorizedUser.findUnique,
  authorizationCreate: prisma.eventAuthorizedUser.create,
};

function installScenario() {
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.email !== undefined) {
        const userId = knownEmails.get(where.email);
        return userId ? { id: userId } : null;
      }
      return where.id === ownerId || where.id === managerId
        ? { id: where.id }
        : null;
    },
  });
  Object.defineProperty(prisma.event, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      events.get(where.id) ?? null,
  });
  Object.defineProperty(prisma.event, "update", {
    configurable: true,
    value: async ({ where, data }: { where: { id: string }; data: Partial<EventRecord> }) => {
      const record = events.get(where.id);
      if (!record) throw new Error("Record not found");
      Object.assign(record, data);
      return record;
    },
  });
  Object.defineProperty(prisma.event, "findMany", {
    configurable: true,
    value: async () =>
      [...events.values()].map((event) => ({
        ...event,
        _count: { participations: 2 },
      })),
  });
  Object.defineProperty(prisma.eventAuthorizedUser, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { eventId_userId: { eventId: string; userId: string } } }) =>
      authorizations.get(`${where.eventId_userId.eventId}:${where.eventId_userId.userId}`) ?? null,
  });
  Object.defineProperty(prisma.eventAuthorizedUser, "create", {
    configurable: true,
    value: async ({ data }: { data: { eventId: string; userId: string; addedByUserId: string } }) => {
      const key = `${data.eventId}:${data.userId}`;
      if (authorizations.has(key)) throw new Error("Unique constraint failed");
      const record = { id: `authorization-${data.userId}`, eventId: data.eventId, userId: data.userId };
      authorizations.set(key, record);
      return record;
    },
  });
}

test.beforeEach(() => {
  events.clear();
  authorizations.clear();
  installScenario();
});

test.after(() => {
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: originalDelegates.userFindUnique });
  Object.defineProperty(prisma.event, "findUnique", { configurable: true, value: originalDelegates.eventFindUnique });
  Object.defineProperty(prisma.event, "findMany", { configurable: true, value: originalDelegates.eventFindMany });
  Object.defineProperty(prisma.event, "update", { configurable: true, value: originalDelegates.eventUpdate });
  Object.defineProperty(prisma.eventAuthorizedUser, "findUnique", { configurable: true, value: originalDelegates.authorizationFindUnique });
  Object.defineProperty(prisma.eventAuthorizedUser, "create", { configurable: true, value: originalDelegates.authorizationCreate });
});

test("updates ordinary Event information for an authorized manager", async () => {
  seedEvent();
  const nextSchedule = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const updated = await updateEventDetails(
    ownerId,
    eventId,
    {
      name: "  Battle of the Rhine Crossing II  ",
      scheduledAt: nextSchedule,
      eventType: " External ",
      description: "  Bring full kit.  ",
      opponent: "",
      map: "Rhine Crossing",
    },
    allowOwnerOnly,
  );

  assert.equal(updated.name, "Battle of the Rhine Crossing II");
  assert.equal(updated.eventType, "External");
  assert.equal(updated.description, "Bring full kit.");
  assert.equal(updated.opponent, null);
  assert.equal(updated.map, "Rhine Crossing");
  assert.equal(updated.scheduledAt.getTime(), nextSchedule.getTime());
});

test("rejects unauthorized updates and invalid Event information", async () => {
  seedEvent();
  const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const valid = {
    name: "Renamed",
    scheduledAt: future,
    eventType: "External",
  };

  await assert.rejects(
    () => updateEventDetails(managerId, eventId, valid, allowOwnerOnly),
    /Unauthorized: user cannot manage this Event/i,
  );
  await assert.rejects(
    () => updateEventDetails(ownerId, "missing-event", valid, allowOwnerOnly),
    /Event not found/i,
  );
  await assert.rejects(
    () =>
      updateEventDetails(ownerId, eventId, { ...valid, name: "   " }, allowOwnerOnly),
    /non-empty name/i,
  );
  await assert.rejects(
    () =>
      updateEventDetails(ownerId, eventId, { ...valid, eventType: "" }, allowOwnerOnly),
    /non-empty event type/i,
  );
});

test("preserves the Event Time Rule while keeping past events editable", async () => {
  const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  seedEvent({ scheduledAt: pastTime });

  await assert.rejects(
    () =>
      updateEventDetails(
        ownerId,
        eventId,
        {
          name: "Renamed",
          scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
          eventType: "External",
        },
        allowOwnerOnly,
      ),
    /cannot be rescheduled into the past/i,
  );

  // The unchanged past time stays valid so other fields remain editable.
  const updated = await updateEventDetails(
    ownerId,
    eventId,
    {
      name: "Renamed after the battle",
      scheduledAt: new Date(pastTime.getTime()),
      eventType: "External",
      description: "Results pending audit.",
    },
    allowOwnerOnly,
  );
  assert.equal(updated.name, "Renamed after the battle");
  assert.equal(updated.scheduledAt.getTime(), pastTime.getTime());
});

test("lists manageable Events with ownership and pending counts", async () => {
  seedEvent();

  const asOwner = await listManageableEvents(ownerId);
  assert.equal(asOwner.length, 1);
  assert.equal(asOwner[0].isOwner, true);
  assert.equal(asOwner[0].pendingRequestCount, 2);
  assert.equal(asOwner[0].event.id, eventId);

  assert.deepEqual(await listManageableEvents(""), []);
});

test("adds a manager by email through the owner-only boundary", async () => {
  seedEvent();

  await authorizeEventUserByEmail(ownerId, eventId, " manager@example.com ");
  assert.ok(authorizations.has(`${eventId}:${managerId}`));

  await assert.rejects(
    () => authorizeEventUserByEmail(ownerId, eventId, "manager@example.com"),
    /already authorized/i,
  );
  await assert.rejects(
    () => authorizeEventUserByEmail(ownerId, eventId, "stranger@example.com"),
    /No website account uses that email/i,
  );
  await assert.rejects(
    () => authorizeEventUserByEmail(ownerId, eventId, "   "),
    /email address is required/i,
  );
  await assert.rejects(
    () => authorizeEventUserByEmail(managerId, eventId, "manager@example.com"),
    /only the Event owner/i,
  );
});
