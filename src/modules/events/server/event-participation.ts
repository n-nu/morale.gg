import "server-only";

import type { EventParticipationStatus as PrismaEventParticipationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canRequestEventParticipation } from "@/modules/units/server/authorization";

export type EventParticipationStatus = PrismaEventParticipationStatus;

export type EventParticipation = {
  id: string;
  eventId: string;
  unitId: string;
  status: EventParticipationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestEventParticipationInput = {
  userId: string;
  eventId: string;
  unitId: string;
};

export function validateEventParticipationTransition(
  from: EventParticipationStatus,
  to: EventParticipationStatus,
): boolean {
  if (from === to) return false;
  if (from === "REQUESTED" && (to === "APPROVED" || to === "DENIED")) {
    return true;
  }
  return false;
}

export function transitionEventParticipationStatus(
  from: EventParticipationStatus,
  to: EventParticipationStatus,
): { status: EventParticipationStatus } {
  if (!validateEventParticipationTransition(from, to)) {
    throw new Error(`Invalid event participation transition from ${from} to ${to}.`);
  }

  return { status: to };
}

export async function listEventParticipationsForEvent(eventId: string): Promise<EventParticipation[]> {
  return prisma.eventParticipation.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listEventParticipationsForUnit(unitId: string): Promise<EventParticipation[]> {
  return prisma.eventParticipation.findMany({
    where: { unitId },
    orderBy: { createdAt: "asc" },
  });
}

async function requestEventParticipationInternal(
  input: RequestEventParticipationInput,
  authorize: (userId: string, unitId: string) => Promise<boolean>,
): Promise<EventParticipation> {
  const { userId, eventId, unitId } = input;

  if (userId.trim() === "") {
    throw new Error("User is required.");
  }

  const [event, unit] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.unit.findUnique({ where: { id: unitId } }),
  ]);

  if (!event) {
    throw new Error("Event not found.");
  }

  if (!unit) {
    throw new Error("Unit not found.");
  }

  const allowed = await authorize(userId, unitId);
  if (!allowed) {
    throw new Error("Unauthorized: user cannot request participation for this unit.");
  }

  const existing = await prisma.eventParticipation.findUnique({
    where: { eventId_unitId: { eventId, unitId } },
  });

  if (existing) {
    throw new Error("An EventParticipation already exists for this Event and Unit.");
  }

  const eventInFuture = event.scheduledAt.getTime() > Date.now();
  if (!eventInFuture) {
    throw new Error("Participation requests are only valid for future events.");
  }

  return prisma.eventParticipation.create({
    data: {
      eventId,
      unitId,
      status: "REQUESTED",
    },
  });
}

export async function requestEventParticipation(
  input: RequestEventParticipationInput,
): Promise<EventParticipation> {
  return requestEventParticipationInternal(input, canRequestEventParticipation);
}
