import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PlayerWorkflowError } from "../validation";
import { normalizeRobloxPlayerId, RobloxLookupError, lookupRobloxIdentities } from "./roblox";

export const ROBLOX_IDENTITY_STALE_AFTER_DAYS = 14;
const STALE_AFTER_MS = ROBLOX_IDENTITY_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

type PlayerDatabase = Pick<Prisma.TransactionClient, "player">;
type Lookup = typeof lookupRobloxIdentities;

export function isRobloxIdentityStale(syncedAt: Date | null, now: Date): boolean {
  return syncedAt === null || now.getTime() - syncedAt.getTime() >= STALE_AFTER_MS;
}

export function normalizeStablePlayerId(value: unknown): string {
  if (typeof value !== "string") throw new PlayerWorkflowError("Player ID is required.");
  const playerId = value.trim();
  if (
    playerId.length === 0 ||
    playerId.length > 128 ||
    /\s/u.test(playerId) ||
    /[\u0000-\u001f\u007f]/u.test(playerId)
  ) {
    throw new PlayerWorkflowError("Player ID must be a valid stable identifier.");
  }
  return playerId;
}

export async function resolveOrCreatePlayersByGameIds(
  values: unknown[],
  db: PlayerDatabase = prisma,
  lookup: Lookup = lookupRobloxIdentities,
  now: () => Date = () => new Date(),
) {
  const requestedIds = [...new Set(values.map(normalizeStablePlayerId))];
  if (requestedIds.length === 0) return [];

  const existing = await db.player.findMany({
    where: { playerId: { in: requestedIds } },
    select: { id: true, playerId: true },
  });
  const existingIds = new Set(existing.map((player) => player.playerId));
  const playerIds = requestedIds.map((playerId) =>
    existingIds.has(playerId) ? playerId : normalizeRobloxPlayerId(playerId),
  );
  const newIds = playerIds.filter((playerId) => !existingIds.has(playerId));

  if (newIds.length > 0) {
    let result: Awaited<ReturnType<Lookup>>;
    try {
      result = await lookup(newIds);
    } catch (error) {
      if (error instanceof RobloxLookupError) {
        throw new PlayerWorkflowError(
          error.kind === "INVALID_ID"
            ? error.message
            : "Roblox could not verify new Player IDs right now. Retry when Roblox is available.",
        );
      }
      throw error;
    }

    if (result.invalidIds.length > 0) {
      throw new PlayerWorkflowError(
        `Roblox could not find these Player IDs: ${result.invalidIds.join(", ")}.`,
      );
    }

    const identityById = new Map(result.identities.map((identity) => [identity.playerId, identity]));
    const missingIds = newIds.filter((playerId) => !identityById.has(playerId));
    if (missingIds.length > 0) {
      throw new PlayerWorkflowError(
        `Roblox did not verify these Player IDs: ${missingIds.join(", ")}.`,
      );
    }

    const syncedAt = now();
    for (const playerId of newIds) {
      const identity = identityById.get(playerId);
      if (!identity) continue;
      await db.player.upsert({
        where: { playerId },
        create: {
          playerId,
          name: null,
          robloxUsername: identity.robloxUsername,
          robloxAvatarUrl: identity.robloxAvatarUrl,
          robloxSyncedAt: syncedAt,
        },
        update: {
          robloxUsername: identity.robloxUsername,
          robloxAvatarUrl: identity.robloxAvatarUrl,
          robloxSyncedAt: syncedAt,
        },
      });
    }
  }

  const uniquePlayerIds = [...new Set(playerIds)];
  if (uniquePlayerIds.length !== playerIds.length) {
    throw new PlayerWorkflowError("Multiple Player IDs resolve to the same Roblox account.");
  }

  const resolved = await db.player.findMany({
    where: { playerId: { in: uniquePlayerIds } },
    select: { id: true, playerId: true },
  });
  const byPlayerId = new Map(resolved.map((player) => [player.playerId, player]));
  const missing = uniquePlayerIds.filter((playerId) => !byPlayerId.has(playerId));
  if (missing.length > 0) {
    throw new PlayerWorkflowError(`Unable to resolve these Player IDs: ${missing.join(", ")}.`);
  }
  return uniquePlayerIds.map((playerId) => byPlayerId.get(playerId)!);
}

export async function refreshStaleRobloxIdentity(
  playerIdValue: string,
  db: PlayerDatabase = prisma,
  lookup: Lookup = lookupRobloxIdentities,
  now: () => Date = () => new Date(),
) {
  const playerId = normalizeStablePlayerId(playerIdValue);
  const existing = await db.player.findUnique({
    where: { playerId },
    select: {
      id: true,
      playerId: true,
      robloxUsername: true,
      robloxAvatarUrl: true,
      robloxSyncedAt: true,
    },
  });
  if (!existing || !isRobloxIdentityStale(existing.robloxSyncedAt, now())) return existing;

  let robloxPlayerId: string;
  try {
    robloxPlayerId = normalizeRobloxPlayerId(playerId);
  } catch (error) {
    if (error instanceof RobloxLookupError && error.kind === "INVALID_ID") return existing;
    throw error;
  }

  const result = await lookup([robloxPlayerId]);
  const identity = result.identities.find((entry) => entry.playerId === robloxPlayerId);
  if (!identity) return existing;

  return db.player.update({
    where: { playerId: robloxPlayerId },
    data: {
      robloxUsername: identity.robloxUsername,
      robloxAvatarUrl: identity.robloxAvatarUrl,
      robloxSyncedAt: now(),
    },
    select: {
      id: true,
      playerId: true,
      robloxUsername: true,
      robloxAvatarUrl: true,
      robloxSyncedAt: true,
    },
  });
}

export async function backfillRobloxIdentityBatch(
  values: string[],
  db: PlayerDatabase = prisma,
  lookup: Lookup = lookupRobloxIdentities,
  now: () => Date = () => new Date(),
) {
  const requestedIds = [...new Set(values.map(normalizeRobloxPlayerId))];
  if (requestedIds.length === 0) return { updated: 0, invalidIds: [] };

  const existing = await db.player.findMany({
    where: { playerId: { in: requestedIds } },
    select: { playerId: true },
  });
  const existingIds = existing.map(({ playerId }) => playerId);
  if (existingIds.length === 0) return { updated: 0, invalidIds: [] };

  const result = await lookup(existingIds);
  const syncedAt = now();
  for (const identity of result.identities) {
    await db.player.update({
      where: { playerId: identity.playerId },
      data: {
        robloxUsername: identity.robloxUsername,
        robloxAvatarUrl: identity.robloxAvatarUrl,
        robloxSyncedAt: syncedAt,
      },
    });
  }

  return { updated: result.identities.length, invalidIds: result.invalidIds };
}
