import "server-only";

import type { Event } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface CreateEventInput {
  name: string;
  scheduledAt: Date;
  eventType: string;
  description?: string;
  opponent?: string;
  map?: string;
}

/**
 * Domain-level Event creation path.
 *
 * TKT-20260914-000005-001 does not expose Event creation to application
 * users; this exists for controlled server-side persistence verification and
 * as the single domain path future authorized creation work must go through.
 * It enforces the Event Time Rule: an Event may not be created already in
 * the past. It performs no authorization — callers own that concern once a
 * permission model exists.
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
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
      description: input.description?.trim() || undefined,
      opponent: input.opponent?.trim() || undefined,
      map: input.map?.trim() || undefined,
    },
  });
}
