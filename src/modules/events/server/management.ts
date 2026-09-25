import "server-only";

import type { Event, EventParticipationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { canManageEvent } from "./authorization";

/**
 * Server-only Event-management reads and writes for the manager workflow.
 * Every entry point is gated by the Event-management capability
 * (`canManageEvent`); owner-only manager administration stays in
 * `authorization.ts`, and participation decisions stay in
 * `event-participation.ts`.
 */

export type ManageableEventSummary = {
  event: Event;
  isOwner: boolean;
  pendingRequestCount: number;
};

export type EventManagerEntry = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
};

export type EventParticipationEntry = {
  id: string;
  unitId: string;
  unitName: string;
  /**
   * Contact person for the request. EventParticipation does not persist the
   * requesting User (Ticket 15 model), so the unit's current commander is
   * shown; recording the actual requester needs a RED schema decision.
   */
  unitCommanderName: string | null;
  status: EventParticipationStatus;
  /** Side the participation was approved into, when assigned. */
  team: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EventManagementView = {
  event: Event;
  isOwner: boolean;
  managers: EventManagerEntry[];
  participations: EventParticipationEntry[];
};

/** Events the User owns or explicitly manages, soonest scheduled first. */
export async function listManageableEvents(
  userId: string,
): Promise<ManageableEventSummary[]> {
  if (userId.trim() === "") return [];

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { ownerUserId: userId },
        { authorizedUsers: { some: { userId } } },
      ],
    },
    include: {
      _count: {
        select: {
          participations: { where: { status: "REQUESTED" } },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return events.map(({ _count, ...event }) => ({
    event,
    isOwner: event.ownerUserId === userId,
    pendingRequestCount: _count.participations,
  }));
}

/** Cheap existence check used to decide whether to surface manage links. */
export async function countManageableEvents(userId: string): Promise<number> {
  if (userId.trim() === "") return 0;

  return prisma.event.count({
    where: {
      OR: [
        { ownerUserId: userId },
        { authorizedUsers: { some: { userId } } },
      ],
    },
  });
}

/**
 * Everything the management screen needs for one Event, or null when the
 * User may not manage it. Pending and denied participation information is
 * management-only data and must not leak into public read paths.
 */
export async function getEventManagementView(
  userId: string,
  eventId: string,
): Promise<EventManagementView | null> {
  if (!(await canManageEvent(userId, eventId))) {
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      authorizedUsers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      participations: {
        include: {
          unit: {
            select: {
              id: true,
              name: true,
              commander: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) return null;

  const { authorizedUsers, participations, ...eventFields } = event;

  return {
    event: eventFields as Event,
    isOwner: event.ownerUserId === userId,
    managers: authorizedUsers.map((authorization) => ({
      id: authorization.id,
      userId: authorization.user.id,
      name: authorization.user.name,
      email: authorization.user.email,
      createdAt: authorization.createdAt,
    })),
    participations: participations.map((participation) => ({
      id: participation.id,
      unitId: participation.unit.id,
      unitName: participation.unit.name,
      unitCommanderName:
        participation.unit.commander.name ??
        participation.unit.commander.email,
      status: participation.status,
      team: participation.team,
      createdAt: participation.createdAt,
      updatedAt: participation.updatedAt,
    })),
  };
}

/**
 * Owner-only manager addition by the User's sign-in email — a management-UI
 * convenience over the Ticket 16 `authorizeEventUser` boundary, which keeps
 * enforcing owner-only administration, duplicate rejection, and owner
 * exclusion.
 */
export async function authorizeEventUserByEmail(
  ownerUserId: string,
  eventId: string,
  email: string,
): Promise<void> {
  const normalized = email.trim();
  if (normalized.length === 0) {
    throw new Error("An email address is required.");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (user === null) {
    throw new Error(
      "No website account uses that email. The person must sign in to morale.gg once before they can be added.",
    );
  }

  const { authorizeEventUser } = await import("./authorization");
  await authorizeEventUser(ownerUserId, eventId, user.id);
}

export interface UpdateEventDetailsInput {
  name: string;
  scheduledAt: Date;
  eventType: string;
  description?: string;
  opponent?: string;
  map?: string;
}

/**
 * Ordinary Event-information management for the owner or an explicit
 * manager. Preserves the Event Time Rule: an Event may not be rescheduled
 * into the past, while leaving an already-past Event's unchanged time valid
 * so its other information stays editable.
 */
export async function updateEventDetails(
  userId: string,
  eventId: string,
  input: UpdateEventDetailsInput,
  authorize: (userId: string, eventId: string) => Promise<boolean> = canManageEvent,
): Promise<Event> {
  if (userId.trim() === "") {
    throw new Error("User is required.");
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Event not found.");
  }

  const allowed = await authorize(userId, eventId);
  if (!allowed) {
    throw new Error("Unauthorized: user cannot manage this Event.");
  }

  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("An event needs a non-empty name.");
  }

  const eventType = input.eventType.trim();
  if (eventType.length === 0) {
    throw new Error("An event needs a non-empty event type.");
  }

  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error("An event needs a valid scheduled date and time.");
  }

  const rescheduled =
    input.scheduledAt.getTime() !== event.scheduledAt.getTime();
  if (rescheduled && input.scheduledAt.getTime() < Date.now()) {
    throw new Error("An event cannot be rescheduled into the past.");
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      name,
      scheduledAt: input.scheduledAt,
      eventType,
      description: input.description?.trim() || null,
      opponent: input.opponent?.trim() || null,
      map: input.map?.trim() || null,
    },
  });
}
