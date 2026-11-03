import "server-only";

import { prisma } from "@/lib/prisma";
import type { PlayerIdentityPresentation } from "../identity";
import { PlayerWorkflowError } from "../validation";
import {
  isRobloxIdentityStale,
  normalizeStablePlayerId,
  resolveOrCreatePlayersByGameIds,
} from "./identity";
import { normalizeRobloxPlayerId, RobloxLookupError, lookupRobloxIdentities } from "./roblox";

export class AuditPlayerResolutionError extends Error {}

export type AuditPlayerIdentityPreview = PlayerIdentityPresentation & {
  existing: boolean;
  verified: boolean;
};

function auditPlayerIds(values: unknown[]): string[] {
  try {
    return [...new Set(values.map(normalizeStablePlayerId))];
  } catch (error) {
    if (error instanceof PlayerWorkflowError) throw new AuditPlayerResolutionError(error.message);
    throw error;
  }
}

export async function previewAuditPlayerIdentities(values: unknown[]): Promise<{
  players: AuditPlayerIdentityPreview[];
  invalidIds: string[];
  unavailable: boolean;
}> {
  const playerIds = auditPlayerIds(values);
  if (playerIds.length === 0) return { players: [], invalidIds: [], unavailable: false };

  const existing = await prisma.player.findMany({
    where: { playerId: { in: playerIds } },
    select: {
      playerId: true,
      robloxUsername: true,
      robloxAvatarUrl: true,
      robloxSyncedAt: true,
    },
  });
  const existingById = new Map(existing.map((player) => [player.playerId, player]));
  const now = new Date();
  const lookupIds: string[] = [];
  const newIds = playerIds.filter((playerId) => !existingById.has(playerId));
  const invalidIds: string[] = [];
  for (const playerId of playerIds) {
    const stored = existingById.get(playerId);
    if (stored && !isRobloxIdentityStale(stored.robloxSyncedAt, now)) continue;
    try {
      lookupIds.push(normalizeRobloxPlayerId(playerId));
    } catch (error) {
      if (!(error instanceof RobloxLookupError) || error.kind !== "INVALID_ID") throw error;
      if (!stored) invalidIds.push(playerId);
    }
  }

  let resolvedById = new Map<string, { robloxUsername: string; robloxAvatarUrl: string | null }>();
  let unavailable = false;
  if (lookupIds.length > 0) {
    try {
      const lookup = await lookupRobloxIdentities(lookupIds);
      resolvedById = new Map(lookup.identities.map((identity) => [
        identity.playerId,
        { robloxUsername: identity.robloxUsername, robloxAvatarUrl: identity.robloxAvatarUrl },
      ]));
      invalidIds.push(...lookup.invalidIds.filter((playerId) => newIds.includes(playerId)));
    } catch (error) {
      if (!(error instanceof RobloxLookupError) || error.kind === "INVALID_ID") throw error;
      if (newIds.length > 0) {
        throw new AuditPlayerResolutionError("Roblox could not verify new Audit Player IDs right now. Retry when Roblox is available.");
      }
      unavailable = true;
      console.warn("Audit preview is using cached Player IDs because Roblox is unavailable.", error.message);
    }
  }

  const players = playerIds.map((playerId) => {
    const stored = existingById.get(playerId);
    const fetched = resolvedById.get(playerId);
    return {
      playerId,
      robloxUsername: fetched?.robloxUsername ?? stored?.robloxUsername ?? null,
      robloxAvatarUrl: fetched?.robloxAvatarUrl ?? stored?.robloxAvatarUrl ?? null,
      existing: Boolean(stored),
      verified: Boolean(stored?.robloxSyncedAt || fetched),
    };
  });
  return { players, invalidIds: [...new Set(invalidIds)], unavailable };
}

export async function resolveOrCreatePlayersForAudit(values: unknown[]) {
  try {
    return await resolveOrCreatePlayersByGameIds(values);
  } catch (error) {
    if (error instanceof RobloxLookupError) {
      throw new AuditPlayerResolutionError(
        error.kind === "INVALID_ID"
          ? error.message
          : "Roblox could not verify new Audit Player IDs right now. Retry when Roblox is available.",
      );
    }
    if (error instanceof PlayerWorkflowError) throw new AuditPlayerResolutionError(error.message);
    throw error;
  }
}

export async function resolveOrCreatePlayerByGameId(value: unknown) {
  const [player] = await resolveOrCreatePlayersForAudit([value]);
  if (!player) throw new AuditPlayerResolutionError("Unable to resolve this Player ID.");
  return player;
}
