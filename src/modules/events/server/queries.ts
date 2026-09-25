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

export type ApprovedEventUnit = { unitId: string; unitName: string };

/**
 * Public read-side: only APPROVED participation is ever exposed here.
 * Pending and denied requests are management-only information.
 */
export async function listApprovedEventUnits(
  eventId: string,
): Promise<ApprovedEventUnit[]> {
  const participations = await prisma.eventParticipation.findMany({
    where: { eventId, status: "APPROVED" },
    include: { unit: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return participations.map((participation) => ({
    unitId: participation.unit.id,
    unitName: participation.unit.name,
  }));
}
