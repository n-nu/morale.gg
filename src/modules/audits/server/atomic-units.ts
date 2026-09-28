import "server-only";

import type { AtomicEventUnit, AuditUnitType, BattlefieldSide } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/modules/events/server/authorization";
import { getApprovedParticipationContext } from "@/modules/events/server/audits";
import { canSubmitAudit } from "@/modules/units/server/authorization";

export class AtomicEventUnitError extends Error {}

export type CreateAtomicEventUnitInput = {
  userId: string;
  participationId: string;
  isMandatory: boolean;
};

export type EventAtomicEventUnitInput = CreateAtomicEventUnitInput & {
  eventId: string;
  name: string;
  side: BattlefieldSide;
  auditUnitType: AuditUnitType;
};

function requiredText(value: string, label: string, maximum = 120): string {
  const normalized = value.trim();
  if (normalized === "") throw new AtomicEventUnitError(`${label} is required.`);
  if (normalized.length > maximum || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new AtomicEventUnitError(`${label} must be at most ${maximum} characters without control characters.`);
  }
  return normalized;
}

function requiredSide(value: BattlefieldSide): BattlefieldSide {
  if (value === "ATTACKER" || value === "DEFENDER") return value;
  throw new AtomicEventUnitError("Select a valid battlefield side.");
}

function requiredAuditUnitType(value: AuditUnitType): AuditUnitType {
  if (value === "REGULAR" || value === "RIFLES" || value === "CAVALRY" || value === "ARTILLERY") return value;
  throw new AtomicEventUnitError("Select a valid Audit Unit type.");
}

export async function listAtomicEventUnits(
  participationId: string,
): Promise<AtomicEventUnit[]> {
  if (participationId.trim() === "") return [];

  const context = await getApprovedParticipationContext(participationId);
  if (context === null) return [];

  return prisma.atomicEventUnit.findMany({
    where: { eventParticipationId: context.participationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAtomicEventUnit(
  input: CreateAtomicEventUnitInput,
): Promise<AtomicEventUnit> {
  if (input.userId.trim() === "") throw new Error("User is required.");
  if (typeof input.isMandatory !== "boolean") {
    throw new Error("Mandatory status is required.");
  }

  const context = await getApprovedParticipationContext(input.participationId);
  if (context === null) throw new Error("Approved EventParticipation not found.");
  if (!(await canSubmitAudit(input.userId, context.unitId))) {
    throw new Error("Unauthorized: user cannot submit an Audit for this Unit.");
  }

  return prisma.atomicEventUnit.create({
    data: {
      eventParticipationId: context.participationId,
      isMandatory: input.isMandatory,
    },
  });
}

export async function createEventAtomicEventUnit(
  input: EventAtomicEventUnitInput,
): Promise<AtomicEventUnit> {
  if (input.userId.trim() === "") throw new AtomicEventUnitError("User is required.");
  if (!(await canManageEvent(input.userId, input.eventId))) {
    throw new AtomicEventUnitError("Unauthorized: user cannot manage this Event.");
  }
  if (typeof input.isMandatory !== "boolean") {
    throw new AtomicEventUnitError("Mandatory status is required.");
  }
  const context = await getApprovedParticipationContext(input.participationId);
  if (context === null || context.eventId !== input.eventId) {
    throw new AtomicEventUnitError("Approved EventParticipation must belong to this Event.");
  }

  return prisma.atomicEventUnit.create({
    data: {
      eventParticipationId: context.participationId,
      name: requiredText(input.name, "Atomic Event-unit name"),
      side: requiredSide(input.side),
      auditUnitType: requiredAuditUnitType(input.auditUnitType),
      isMandatory: input.isMandatory,
    },
  });
}

export type UpdateEventAtomicEventUnitInput = {
  eventId: string;
  atomicEventUnitId: string;
  name: string;
  side: BattlefieldSide;
  auditUnitType: AuditUnitType;
  participationId: string;
  isMandatory: boolean;
};

export async function updateEventAtomicEventUnit(
  userId: string,
  input: UpdateEventAtomicEventUnitInput,
): Promise<AtomicEventUnit> {
  if (userId.trim() === "" || input.eventId.trim() === "" || input.atomicEventUnitId.trim() === "") {
    throw new AtomicEventUnitError("User, Event, and atomic Event-unit are required.");
  }
  if (!(await canManageEvent(userId, input.eventId))) {
    throw new AtomicEventUnitError("Unauthorized: user cannot manage this Event.");
  }
  const context = await getApprovedParticipationContext(input.participationId);
  if (context === null || context.eventId !== input.eventId) {
    throw new AtomicEventUnitError("Approved EventParticipation must belong to this Event.");
  }
  const existing = await prisma.atomicEventUnit.findUnique({
    where: { id: input.atomicEventUnitId },
    select: { id: true, eventParticipation: { select: { eventId: true } } },
  });
  if (existing === null || existing.eventParticipation.eventId !== input.eventId) {
    throw new AtomicEventUnitError("Atomic Event-unit must belong to this Event.");
  }
  return prisma.atomicEventUnit.update({
    where: { id: input.atomicEventUnitId },
    data: {
      name: requiredText(input.name, "Atomic Event-unit name"),
      side: requiredSide(input.side),
      auditUnitType: requiredAuditUnitType(input.auditUnitType),
      eventParticipationId: context.participationId,
      isMandatory: input.isMandatory,
    },
  });
}

export async function deleteEventAtomicEventUnit(userId: string, eventId: string, atomicEventUnitId: string) {
  if (!(await canManageEvent(userId, eventId))) {
    throw new AtomicEventUnitError("Unauthorized: user cannot manage this Event.");
  }
  const atomicUnit = await prisma.atomicEventUnit.findUnique({
    where: { id: atomicEventUnitId },
    include: { eventParticipation: { select: { eventId: true } }, audit: { select: { id: true } }, commandGroupMembership: { select: { atomicEventUnitId: true } } },
  });
  if (atomicUnit === null || atomicUnit.eventParticipation.eventId !== eventId) {
    throw new AtomicEventUnitError("Atomic Event-unit must belong to this Event.");
  }
  if (atomicUnit.audit !== null || atomicUnit.commandGroupMembership !== null) {
    throw new AtomicEventUnitError("Atomic Event-unit cannot be removed after Audit or structure history exists.");
  }
  return prisma.atomicEventUnit.delete({ where: { id: atomicEventUnitId } });
}

export type AuditAtomicEventUnit = AtomicEventUnit & {
  eventParticipation: { id: string; eventId: string; unitId: string; event: { id: string; name: string }; unit: { id: string; name: string } };
};

export async function listAuthorizedAtomicEventUnits(userId: string): Promise<AuditAtomicEventUnit[]> {
  if (userId.trim() === "") return [];
  const participations = await prisma.eventParticipation.findMany({
    where: { status: "APPROVED" },
    select: { id: true, unitId: true },
    orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
  });
  const authorizedParticipationIds = new Set<string>();
  for (const participation of participations) {
    if (await canSubmitAudit(userId, participation.unitId)) authorizedParticipationIds.add(participation.id);
  }
  if (authorizedParticipationIds.size === 0) return [];
  return prisma.atomicEventUnit.findMany({
    where: { eventParticipationId: { in: [...authorizedParticipationIds] } },
    include: {
      eventParticipation: {
        select: {
          id: true,
          eventId: true,
          unitId: true,
          event: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ eventParticipation: { eventId: "asc" } }, { createdAt: "asc" }],
  });
}

export async function deleteAtomicEventUnit(
  userId: string,
  atomicEventUnitId: string,
): Promise<AtomicEventUnit> {
  if (userId.trim() === "" || atomicEventUnitId.trim() === "") {
    throw new Error("User and atomic Event-unit are required.");
  }

  const atomicUnit = await prisma.atomicEventUnit.findUnique({
    where: { id: atomicEventUnitId },
    include: { eventParticipation: { select: { unitId: true } } },
  });
  if (atomicUnit === null) throw new Error("Atomic Event-unit not found.");
  if (!(await canSubmitAudit(userId, atomicUnit.eventParticipation.unitId))) {
    throw new Error("Unauthorized: user cannot delete this atomic Event-unit.");
  }

  return prisma.atomicEventUnit.delete({ where: { id: atomicEventUnitId } });
}

export const createAtomicUnit = createAtomicEventUnit;
export const listAtomicUnits = listAtomicEventUnits;
export const deleteAtomicUnit = deleteAtomicEventUnit;
