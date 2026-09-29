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

