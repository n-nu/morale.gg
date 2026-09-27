import "server-only";

import { prisma } from "@/lib/prisma";

export type ApprovedParticipationContext = {
  participationId: string;
  eventId: string;
  unitId: string;
  event: { id: string; name: string };
  unit: { id: string; name: string };
};

export async function getApprovedParticipationContext(
  participationId: string,
): Promise<ApprovedParticipationContext | null> {
  if (participationId.trim() === "") return null;

  const participation = await prisma.eventParticipation.findUnique({
    where: { id: participationId, status: "APPROVED" },
    select: {
      id: true,
      eventId: true,
      unitId: true,
      event: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  if (participation === null) return null;

  return {
    participationId: participation.id,
    eventId: participation.eventId,
    unitId: participation.unitId,
    event: participation.event,
    unit: participation.unit,
  };
}
