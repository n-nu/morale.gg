import "server-only";

import { prisma } from "@/lib/prisma";

export type MembershipPeriodReference = {
  id: string;
  unitId: string;
  startedAt: Date;
  endedAt: Date | null;
};

export async function getMembershipPeriodAtEventTime(
  gamePlayerId: string,
  unitId: string,
  eventTime: Date,
  db = prisma,
): Promise<MembershipPeriodReference | null> {
  const player = await db.player.findUnique({
    where: { playerId: gamePlayerId },
    select: { id: true },
  });
  if (player === null) return null;
  const internalPlayerId = player.id;

  return db.unitMembership.findFirst({
    where: {
      playerId: internalPlayerId,
      unitId,
      startedAt: { lte: eventTime },
      OR: [
        { endedAt: null },
        { endedAt: { gt: eventTime } },
      ],
    },
    select: { id: true, unitId: true, startedAt: true, endedAt: true },
    orderBy: [{ startedAt: "asc" }, { id: "asc" }],
  });
}

export async function isMembershipActiveAt(
  gamePlayerId: string,
  unitId: string,
  eventTime: Date,
  db = prisma,
): Promise<boolean> {
  return (await getMembershipPeriodAtEventTime(gamePlayerId, unitId, eventTime, db)) !== null;
}
