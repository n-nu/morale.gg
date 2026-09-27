import "server-only";

import type { AtomicEventUnit } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getApprovedParticipationContext } from "@/modules/events/server/audits";
import { canSubmitAudit } from "@/modules/units/server/authorization";

export type CreateAtomicEventUnitInput = {
  userId: string;
  participationId: string;
  isMandatory: boolean;
};

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
