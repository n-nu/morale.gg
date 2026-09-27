import "server-only";

import { prisma } from "@/lib/prisma";

export type CanonicalEventTime = {
  eventId: string;
  occurredAt: Date;
};

function normalizedIds(eventIds: readonly string[]): string[] {
  return [...new Set(eventIds.map((eventId) => eventId.trim()).filter(Boolean))];
}

export async function getCanonicalEventTimes(
  eventIds?: readonly string[],
): Promise<CanonicalEventTime[]> {
  const selectedEventIds = eventIds === undefined ? undefined : normalizedIds(eventIds);
  if (selectedEventIds !== undefined && selectedEventIds.length === 0) return [];

  const events = await prisma.event.findMany({
    where: selectedEventIds === undefined ? undefined : { id: { in: selectedEventIds } },
    select: { id: true, scheduledAt: true },
    orderBy: { id: "asc" },
  });

  return events.map((event) => ({
    eventId: event.id,
    occurredAt: new Date(event.scheduledAt.getTime()),
  }));
}
