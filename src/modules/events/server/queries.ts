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
 * Public read-side: approved participation grouped by assigned side, for the
 * versus presentation. Only APPROVED rows with a side are exposed.
 */
export type EventTeamGroup = { team: string; units: ApprovedEventUnit[] };

export async function listApprovedEventTeams(
  eventId: string,
): Promise<EventTeamGroup[]> {
  const participations = await prisma.eventParticipation.findMany({
    where: { eventId, status: "APPROVED" },
    include: { unit: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, ApprovedEventUnit[]>();
  for (const participation of participations) {
    const team = participation.team?.trim();
    if (!team) continue;
    const units = groups.get(team) ?? [];
    units.push({
      unitId: participation.unit.id,
      unitName: participation.unit.name,
    });
    groups.set(team, units);
  }

  return [...groups.entries()].map(([team, units]) => ({ team, units }));
}

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
