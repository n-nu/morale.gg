import "server-only";
import { prisma } from "@/lib/prisma";

export function listPlayers(search = "", db = prisma) {
  const query = search.trim().slice(0, 128);
  return db.player.findMany({
    where: query ? { OR: [
      { playerId: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ] } : undefined,
    select: { playerId: true, name: true },
    orderBy: [{ name: "asc" }, { playerId: "asc" }],
    take: 50,
  });
}

export function findPlayerByGameId(playerId: string, db = prisma) {
  return db.player.findUnique({ where: { playerId: playerId.trim() } });
}

export function getPlayer(id: string, db = prisma) {
  return db.player.findUnique({ where: { id } });
}

export function getPlayerMemberships(playerId: string, db = prisma) {
  return db.unitMembership.findMany({
    where: { playerId },
    include: { unit: { select: { id: true, name: true } } },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
  });
}

export function getCurrentRoster(unitId: string, db = prisma) {
  return db.unitMembership.findMany({
    where: { unitId, endedAt: null },
    select: {
      id: true,
      startedAt: true,
      player: { select: { playerId: true, name: true } },
    },
    orderBy: [{ player: { name: "asc" } }, { id: "asc" }],
  }).then((memberships) => memberships.map(({ id, ...membership }) => ({
    membershipId: id,
    ...membership,
  })));
}

export async function getCurrentRosterCounts(unitIds: string[], db = prisma) {
  const uniqueUnitIds = [...new Set(unitIds)];
  if (uniqueUnitIds.length === 0) return [];

  const groupedMemberships = await db.unitMembership.groupBy({
    by: ["unitId"],
    where: { unitId: { in: uniqueUnitIds }, endedAt: null },
    _count: { _all: true },
  });
  const countByUnitId = new Map(
    groupedMemberships.map(({ unitId, _count }) => [unitId, _count._all]),
  );

  return uniqueUnitIds.map((unitId) => ({
    unitId,
    memberCount: countByUnitId.get(unitId) ?? 0,
  }));
}
