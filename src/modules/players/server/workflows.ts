import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { canManageRoster } from "@/modules/units/server/authorization";
import { PlayerWorkflowError, requiredText } from "../validation";
import { resolveOrCreatePlayersByGameIds } from "./identity";

type PlayerWorkflowDependencies = {
  db?: typeof prisma;
  getUserId?: typeof getAuthenticatedUserId;
  authorize?: typeof canManageRoster;
  resolvePlayers?: (playerIds: unknown[]) => Promise<Array<{ id: string; playerId: string }>>;
};

// Server-only dependency seam for focused tests; never a Server Action argument.
export function playerWorkflows(dependencies: PlayerWorkflowDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const authorize = dependencies.authorize ?? canManageRoster;
  const resolvePlayers = dependencies.resolvePlayers
    ?? ((playerIds: unknown[]) => resolveOrCreatePlayersByGameIds(playerIds, db));

  async function authenticated() {
    const userId = await getUserId();
    if (!userId?.trim()) throw new PlayerWorkflowError("Sign in to manage players and rosters.");
    return userId;
  }

  async function protect(userId: string, unitId: string) {
    if (!(await authorize(userId, unitId))) {
      throw new PlayerWorkflowError("You do not have permission to manage this roster.");
    }
  }

  return {
    async registerPlayer(input: { playerId: unknown }) {
      await authenticated();
      const [player] = await resolvePlayers([input.playerId]);
      if (!player) throw new PlayerWorkflowError("Roblox could not verify this Player ID.");
      return player;
    },

    async addMembership(input: { playerId: unknown; unitId: unknown }) {
      const userId = await authenticated();
      const playerId = requiredText(input.playerId, "Player");
      const unitId = requiredText(input.unitId, "Unit");
      try {
        return await db.$transaction(async (tx) => {
          if (!(await tx.unit.findUnique({ where: { id: unitId }, select: { id: true } }))) {
            throw new PlayerWorkflowError("Unit not found.");
          }
          if (!(await tx.player.findUnique({ where: { id: playerId }, select: { id: true } }))) {
            throw new PlayerWorkflowError("Player not found.");
          }
          await protect(userId, unitId);
          return tx.unitMembership.create({ data: { playerId, unitId } });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") throw new PlayerWorkflowError("This Player is already on the current roster.");
          if (error.code === "P2003") throw new PlayerWorkflowError("Player or Unit no longer exists.");
        }
        throw error;
      }
    },

    async endMembership(input: { membershipId: unknown; unitId: unknown }) {
      const userId = await authenticated();
      const membershipId = requiredText(input.membershipId, "Membership");
      const unitId = requiredText(input.unitId, "Unit");
      return db.$transaction(async (tx) => {
        const membership = await tx.unitMembership.findUnique({ where: { id: membershipId } });
        if (!membership || membership.unitId !== unitId) throw new PlayerWorkflowError("Membership not found in this Unit.");
        if (membership.endedAt) throw new PlayerWorkflowError("This membership has already ended.");
        await protect(userId, membership.unitId);
        const endedAt = new Date(Math.max(Date.now(), membership.startedAt.getTime()));
        const result = await tx.unitMembership.updateMany({
          where: { id: membershipId, unitId, endedAt: null },
          data: { endedAt },
        });
        if (result.count !== 1) throw new PlayerWorkflowError("This membership has already ended.");
        return { ...membership, endedAt };
      });
    },
  };
}

export const { registerPlayer, addMembership, endMembership } = playerWorkflows();
