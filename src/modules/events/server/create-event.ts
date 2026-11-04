import "server-only";

import type { Event, EventInvitePolicy } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";
import { canCreateEvent } from "@/modules/units/server/authorization";

import {
  normalizeEventSideName,
  validateEventInvitePolicy,
  validateEventSchedule,
} from "./validation";

export interface CreateEventInput {
  name: string;
  scheduledAt: Date;
  eventType: string;
  rallyMinutesBeforeStart?: number;
  durationMinutes: number;
  attackerName?: string;
  defenderName?: string;
  invitePolicy?: EventInvitePolicy;
  description?: string;
  map?: string;
}

export async function createEventForAuthenticatedUser(
  input: CreateEventInput,
  authenticatedUserId: string,
  authorize: (userId: string) => Promise<boolean> = canCreateEvent,
): Promise<Event> {
  if (authenticatedUserId.trim() === "") {
    throw new Error("Authentication is required to create an Event.");
  }

  if (!(await authorize(authenticatedUserId))) {
    throw new Error("Unauthorized: user cannot create Events.");
  }

  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("An event needs a non-empty name.");
  }

  const eventType = input.eventType.trim();
  if (eventType.length === 0) {
    throw new Error("An event needs a non-empty event type.");
  }

  const rallyMinutesBeforeStart = input.rallyMinutesBeforeStart ?? 0;
  validateEventSchedule(
    input.scheduledAt,
    rallyMinutesBeforeStart,
    input.durationMinutes,
  );
  if (input.scheduledAt.getTime() < Date.now()) {
    throw new Error("An event cannot be created with a scheduled date in the past.");
  }
  const invitePolicy = validateEventInvitePolicy(input.invitePolicy ?? "OPEN");

  return prisma.event.create({
    data: {
      name,
      scheduledAt: input.scheduledAt,
      rallyMinutesBeforeStart,
      durationMinutes: input.durationMinutes,
      eventType,
      ownerUserId: authenticatedUserId,
      description: input.description?.trim() || undefined,
      attackerName: normalizeEventSideName(input.attackerName),
      defenderName: normalizeEventSideName(input.defenderName),
      invitePolicy,
      map: input.map?.trim() || undefined,
    },
  });
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (authenticatedUserId === null) {
    throw new Error("Authentication is required to create an Event.");
  }

  return createEventForAuthenticatedUser(input, authenticatedUserId);
}
