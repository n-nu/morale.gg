import "server-only";

import type { Event } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type { Event };

/**
 * All events, soonest scheduled date first. Public read-side data; callers
 * decide presentation (e.g. splitting upcoming from past).
 */
export async function listEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getEventById(eventId: string): Promise<Event | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
  });
}
