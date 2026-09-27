import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditRead = {
  id: string;
  atomicEventUnitId: string;
  lifecycle: "DRAFT" | "FINAL";
  unitType: string | null;
  tickets: number | null;
  flagCaptures: number | null;
  flagLosses: number | null;
  stars: number | null;
  results: Array<{
    playerId: string;
    gamePlayerId: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  roles: Array<{ gamePlayerId: string; role: "COMMANDER" | "FLAG_BEARER" }>;
};

export async function getAuditForAtomicUnit(
  atomicEventUnitId: string,
  viewerUserId: string | null,
): Promise<AuditRead | null> {
  if (atomicEventUnitId.trim() === "") return null;

  const audit = await prisma.audit.findUnique({
    where: { atomicEventUnitId },
    include: {
      playerResults: { include: { player: { select: { playerId: true } } }, orderBy: { kills: "desc" } },
      roles: { include: { player: { select: { playerId: true } } }, orderBy: { role: "asc" } },
    },
  });

  if (audit === null) return null;
  if (audit.lifecycle === "DRAFT" && audit.createdByUserId !== viewerUserId) return null;

  return {
    id: audit.id,
    atomicEventUnitId: audit.atomicEventUnitId,
    lifecycle: audit.lifecycle,
    unitType: audit.unitType,
    tickets: audit.tickets,
    flagCaptures: audit.flagCaptures,
    flagLosses: audit.flagLosses,
    stars: audit.stars,
    results: audit.lifecycle === "FINAL"
      ? audit.playerResults.map((result) => ({
          playerId: result.playerId,
          gamePlayerId: result.player.playerId,
          kills: result.kills,
          deaths: result.deaths,
          assists: result.assists,
        }))
      : [],
    roles: audit.lifecycle === "FINAL"
      ? audit.roles.map((role) => ({ gamePlayerId: role.player.playerId, role: role.role }))
      : [],
  };
}