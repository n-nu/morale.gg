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

export type PublicEventPresentation = {
  eventId: string;
  name: string;
  eventType: string;
  scheduledAt: Date;
  map: string | null;
  opponent: string | null;
};

export async function getPublicEventPresentationBatch(
  eventIds: readonly string[],
): Promise<PublicEventPresentation[]> {
  const selectedIds = [...new Set(eventIds.map((eventId) => eventId.trim()).filter(Boolean))];
  if (selectedIds.length === 0) return [];

  const events = await prisma.event.findMany({
    where: { id: { in: selectedIds } },
    select: {
      id: true,
      name: true,
      eventType: true,
      scheduledAt: true,
      map: true,
      opponent: true,
    },
  });
  const eventsById = new Map(events.map((event) => [event.id, event]));

  return selectedIds.flatMap((eventId) => {
    const event = eventsById.get(eventId);
    return event
      ? [{
          eventId: event.id,
          name: event.name,
          eventType: event.eventType,
          scheduledAt: new Date(event.scheduledAt.getTime()),
          map: event.map,
          opponent: event.opponent,
        }]
      : [];
  });
}

export type ApprovedEventUnit = {
  unitId: string;
  unitName: string;
  imageRef: string | null;
};

/**
 * Public read-side: only APPROVED participation is ever exposed here.
 * Pending and denied requests are management-only information.
 */
export async function listApprovedEventUnits(
  eventId: string,
): Promise<ApprovedEventUnit[]> {
  const participations = await prisma.eventParticipation.findMany({
    where: { eventId, status: "APPROVED" },
    include: { unit: { select: { id: true, name: true, imageRef: true } } },
    orderBy: { createdAt: "asc" },
  });

  return participations.map((participation) => ({
    unitId: participation.unit.id,
    unitName: participation.unit.name,
    imageRef: participation.unit.imageRef,
  }));
}
