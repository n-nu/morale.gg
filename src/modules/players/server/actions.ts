"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { canManageRoster } from "@/modules/units/server/authorization";
import type { PlayerIdentityPresentation } from "../identity";
import { normalizeRobloxPlayerId, RobloxLookupError, lookupRobloxIdentities } from "./roblox";
import {
  normalizeStablePlayerId,
  refreshStaleRobloxIdentity,
  resolveOrCreatePlayersByGameIds,
} from "./identity";
import { registerPlayer, addMembership, endMembership } from "./workflows";
import { findPlayerByGameId, getPlayer } from "./queries";
import { PlayerWorkflowError, requiredText } from "../validation";

export type FormState = {
  message: string;
  ok: boolean;
  playerId?: string;
  identity?: PlayerIdentityPresentation;
  existing?: boolean;
  verified?: boolean;
};

async function result(operation: () => Promise<FormState>): Promise<FormState> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PlayerWorkflowError) return { ok: false, message: error.message };
    if (error instanceof RobloxLookupError) {
      return {
        ok: false,
        message: error.kind === "INVALID_ID"
          ? error.message
          : "Roblox identity lookup is temporarily unavailable. Please retry.",
      };
    }
    console.error("Player workflow failed", error);
    return { ok: false, message: "Unable to save right now. Please try again." };
  }
}

async function previewIdentity(value: unknown): Promise<{
  identity: PlayerIdentityPresentation;
  existing: boolean;
  verified: boolean;
  message: string;
}> {
  const stablePlayerId = normalizeStablePlayerId(value);
  const existing = await findPlayerByGameId(stablePlayerId);
  if (existing) {
    let player = {
      playerId: existing.playerId,
      robloxUsername: existing.robloxUsername,
      robloxAvatarUrl: existing.robloxAvatarUrl,
      robloxSyncedAt: existing.robloxSyncedAt,
    };
    let refreshMessage = "";
    try {
      player = await refreshStaleRobloxIdentity(stablePlayerId) ?? existing;
    } catch (error) {
      if (!(error instanceof RobloxLookupError)) throw error;
      console.warn("Using existing Player identity because Roblox refresh failed.", error.message);
      refreshMessage = " Roblox is unavailable; this existing Player can still be reused by its canonical ID.";
    }
    return {
      identity: {
        playerId: player.playerId,
        robloxUsername: player.robloxUsername,
        robloxAvatarUrl: player.robloxAvatarUrl,
      },
      existing: true,
      verified: player.robloxSyncedAt !== null,
      message: `Existing Player found.${refreshMessage}`,
    };
  }

  let playerId: string;
  try {
    playerId = normalizeRobloxPlayerId(stablePlayerId);
  } catch (error) {
    if (error instanceof RobloxLookupError) throw new PlayerWorkflowError(error.message);
    throw error;
  }
  const result = await lookupRobloxIdentities([playerId]);
  if (result.invalidIds.includes(playerId)) {
    throw new PlayerWorkflowError(`Roblox could not find Player ID ${playerId}. Check the ID and try again.`);
  }
  const resolved = result.identities.find((identity) => identity.playerId === playerId);
  if (!resolved) throw new PlayerWorkflowError(`Roblox did not verify Player ID ${playerId}.`);
  return {
    identity: resolved,
    existing: false,
    verified: true,
    message: "Confirm this Roblox account before continuing.",
  };
}

export async function previewPlayerIdentityAction(_previous: FormState, data: FormData) {
  return result(async () => {
    if (!(await getAuthenticatedUserId())?.trim()) throw new PlayerWorkflowError("Sign in to manage Players.");
    const preview = await previewIdentity(data.get("playerId"));
    return { ok: true, playerId: preview.identity.playerId, ...preview };
  });
}

export async function previewRosterPlayerIdentityAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const userId = await getAuthenticatedUserId();
    if (!userId?.trim()) throw new PlayerWorkflowError("Sign in to manage rosters.");
    const unitId = requiredText(data.get("unitId"), "Unit");
    if (!(await canManageRoster(userId, unitId))) {
      throw new PlayerWorkflowError("You do not have permission to manage this roster.");
    }
    const preview = await previewIdentity(data.get("playerId"));
    return { ok: true, playerId: preview.identity.playerId, ...preview };
  });
}

export async function registerPlayerAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const gameId = normalizeStablePlayerId(data.get("playerId"));
    const wasExisting = await findPlayerByGameId(gameId) !== null;
    const player = await registerPlayer({ playerId: gameId });
    revalidatePath("/players");
    return {
      ok: true,
      message: wasExisting
        ? `Existing Player reused: Roblox ID ${player.playerId}.`
        : `Registered Roblox ID ${player.playerId}.`,
      playerId: player.playerId,
    };
  });
}

export async function addMembershipAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const unitId = requiredText(data.get("unitId"), "Unit");
    const gameId = normalizeStablePlayerId(data.get("playerId"));
    const userId = await getAuthenticatedUserId();
    if (!userId?.trim()) throw new PlayerWorkflowError("Sign in to manage rosters.");
    if (!(await canManageRoster(userId, unitId))) {
      throw new PlayerWorkflowError("You do not have permission to manage this roster.");
    }
    const existing = await findPlayerByGameId(gameId);
    if (existing) {
      try {
        await refreshStaleRobloxIdentity(gameId);
      } catch (error) {
        if (!(error instanceof RobloxLookupError)) throw error;
        console.warn("Continuing roster addition with cached Player identity.", error.message);
      }
    }
    const [player] = await resolveOrCreatePlayersByGameIds([gameId]);
    if (!player) throw new PlayerWorkflowError("Roblox could not verify this Player ID.");
    await addMembership({ unitId, playerId: player.id });
    revalidatePath(`/units/${unitId}`);
    revalidatePath(`/players/${player.playerId}`);
    return { ok: true, message: `Roblox ID ${player.playerId} added to the roster.` };
  });
}

export async function endMembershipAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const membership = await endMembership({ unitId: data.get("unitId"), membershipId: data.get("membershipId") });
    revalidatePath(`/units/${membership.unitId}`);
    const player = await getPlayer(membership.playerId);
    if (player) revalidatePath(`/players/${player.playerId}`);
    return { ok: true, message: "Membership ended. Player and membership history preserved." };
  });
}
