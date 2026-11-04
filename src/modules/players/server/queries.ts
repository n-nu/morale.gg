import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PlayerMembershipDatabase = Pick<Prisma.TransactionClient, "unitMembership">;
type PlayerIdentityDatabase = Pick<Prisma.TransactionClient, "player">;

export function listPlayers(search = "", db = prisma) {
  const query = search.trim().slice(0, 128);
  return db.player.findMany({
    where: query ? { OR: [
      { playerId: { contains: query, mode: "insensitive" } },
      { robloxUsername: { contains: query, mode: "insensitive" } },
    ] } : undefined,
    select: { playerId: true, robloxUsername: true, robloxAvatarUrl: true },
    orderBy: [{ robloxUsername: "asc" }, { playerId: "asc" }],
    take: 50,
  });
}

export async function getPlayerIdentityPresentationBatch(
  playerIds: string[],
  db: PlayerIdentityDatabase = prisma,
) {
  const uniqueIds = [...new Set(playerIds.map((playerId) => playerId.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const players = await db.player.findMany({
    where: { playerId: { in: uniqueIds } },
    select: { playerId: true, robloxUsername: true, robloxAvatarUrl: true },
  });
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  return uniqueIds.flatMap((playerId) => {
    const player = playerById.get(playerId);
    return player ? [player] : [];
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

export async function getCurrentUnitIdsForPlayer(
  playerId: string,
  db: PlayerMembershipDatabase = prisma,
) {
  const memberships = await db.unitMembership.findMany({
    where: {
      endedAt: null,
      player: { is: { playerId: playerId.trim() } },
    },
    select: { unitId: true },
    orderBy: [{ unitId: "asc" }],
  });
  return [...new Set(memberships.map(({ unitId }) => unitId))].sort();
}

export function getCurrentRoster(unitId: string, db = prisma) {
  return db.unitMembership.findMany({
    where: { unitId, endedAt: null },
    select: {
      id: true,
      startedAt: true,
      player: { select: { playerId: true, robloxUsername: true, robloxAvatarUrl: true } },
    },
    orderBy: [{ player: { robloxUsername: "asc" } }, { id: "asc" }],
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
