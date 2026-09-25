import "server-only";

import type { Event } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";
import { canCreateEvent } from "@/modules/units/server/authorization";

export interface CreateEventInput {
  name: string;
  scheduledAt: Date;
  eventType: string;
  description?: string;
  opponent?: string;
  map?: string;
  /** Named host side for two-sided events; opposing side uses `opponent`. */
  hostSide?: string;
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

  if (input.scheduledAt.getTime() < Date.now()) {
    throw new Error("An event cannot be created with a scheduled date in the past.");
  }

  return prisma.event.create({
    data: {
      name,
      scheduledAt: input.scheduledAt,
      eventType,
      ownerUserId: authenticatedUserId,
      description: input.description?.trim() || undefined,
      opponent: input.opponent?.trim() || undefined,
      map: input.map?.trim() || undefined,
      hostSide: input.hostSide?.trim() || undefined,
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
