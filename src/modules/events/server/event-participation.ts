import "server-only";

import type { EventParticipationStatus as PrismaEventParticipationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canRequestEventParticipation } from "@/modules/units/server/authorization";

import { canManageEvent } from "./authorization";

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

export type EventParticipationDecision = Extract<
  EventParticipationStatus,
  "APPROVED" | "DENIED"
>;

export type DecideEventParticipationInput = {
  userId: string;
  participationId: string;
  decision: EventParticipationDecision;
  /** Side the unit is approved into; stored only on approval. */
  team?: string | null;
};

/**
 * Event-side participation decision. Authorization uses the Event-management
 * capability (`canManageEvent`), never Unit authority. The only valid
 * transitions are REQUESTED -> APPROVED and REQUESTED -> DENIED; terminal
 * records fail safely, including under concurrent decisions.
 */
export async function decideEventParticipation(
  input: DecideEventParticipationInput,
  authorize: (userId: string, eventId: string) => Promise<boolean> = canManageEvent,
): Promise<EventParticipation> {
  const { userId, participationId, decision } = input;

  if (userId.trim() === "") {
    throw new Error("User is required.");
  }

  const participation = await prisma.eventParticipation.findUnique({
    where: { id: participationId },
  });
  if (!participation) {
    throw new Error("Participation request not found.");
  }

  const allowed = await authorize(userId, participation.eventId);
  if (!allowed) {
    throw new Error(
      "Unauthorized: user cannot decide participation for this Event.",
    );
  }

  // Validates REQUESTED -> APPROVED/DENIED and rejects terminal transitions.
  transitionEventParticipationStatus(participation.status, decision);

  // The status guard makes the write atomic: a concurrent decision that
  // already moved the record out of REQUESTED updates zero rows.
  const assignedTeam =
    decision === "APPROVED" ? input.team?.trim() || null : undefined;
  const updated = await prisma.eventParticipation.updateMany({
    where: { id: participationId, status: "REQUESTED" },
    data:
      assignedTeam === undefined
        ? { status: decision }
        : { status: decision, team: assignedTeam },
  });
  if (updated.count === 0) {
    throw new Error(
      "Invalid event participation transition: the request was already decided.",
    );
  }

  return prisma.eventParticipation.findUniqueOrThrow({
    where: { id: participationId },
  });
}

export async function approveEventParticipation(
  userId: string,
  participationId: string,
  team?: string | null,
): Promise<EventParticipation> {
  return decideEventParticipation({ userId, participationId, decision: "APPROVED", team });
}

export async function denyEventParticipation(
  userId: string,
  participationId: string,
): Promise<EventParticipation> {
  return decideEventParticipation({ userId, participationId, decision: "DENIED" });
}
