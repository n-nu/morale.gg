"use server";

import { revalidatePath } from "next/cache";
import { registerPlayer, addMembership, endMembership } from "./workflows";
import { findPlayerByGameId } from "./queries";
import { PlayerWorkflowError, requiredText } from "../validation";

export type FormState = { message: string; ok: boolean; playerId?: string };

async function result(operation: () => Promise<FormState>): Promise<FormState> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PlayerWorkflowError) return { ok: false, message: error.message };
    console.error("Player workflow failed", error);
    return { ok: false, message: "Unable to save right now. Please try again." };
  }
}

export async function registerPlayerAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const player = await registerPlayer({ playerId: data.get("playerId"), name: data.get("name") });
    revalidatePath("/players");
    return { ok: true, message: `Registered ${player.name}. You can now add this Player using their game Player ID.`, playerId: player.id };
  });
}

export async function addMembershipAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const unitId = requiredText(data.get("unitId"), "Unit");
    const gameId = requiredText(data.get("playerId"), "Game Player ID");
    const player = await findPlayerByGameId(gameId);
    if (!player) throw new PlayerWorkflowError("Player not found. Register this game Player ID first.");
    await addMembership({ unitId, playerId: player.id });
    revalidatePath(`/units/${unitId}`);
    revalidatePath(`/players/${player.id}`);
    return { ok: true, message: `${player.name} added to the roster.` };
  });
}

export async function endMembershipAction(_previous: FormState, data: FormData) {
  return result(async () => {
    const membership = await endMembership({ unitId: data.get("unitId"), membershipId: data.get("membershipId") });
    revalidatePath(`/units/${membership.unitId}`);
    revalidatePath(`/players/${membership.playerId}`);
    return { ok: true, message: "Membership ended. Player and membership history preserved." };
  });
}
