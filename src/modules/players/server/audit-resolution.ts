import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { PlayerWorkflowError, requiredText } from "../validation";

export type ResolvedPlayer = { id: string; playerId: string };

function validateGamePlayerId(value: unknown): string {
  const playerId = requiredText(value, "Game Player ID");
  if (/\s/u.test(playerId)) {
    throw new PlayerWorkflowError("Game Player ID cannot contain whitespace.");
  }
  return playerId;
}

export async function resolveOrCreatePlayerByGameId(
  value: unknown,
): Promise<ResolvedPlayer> {
  const playerId = validateGamePlayerId(value);
  const existing = await prisma.player.findUnique({
    where: { playerId },
    select: { id: true, playerId: true },
  });
  if (existing !== null) return existing;

  try {
    return await prisma.player.create({
      data: { playerId, name: null },
      select: { id: true, playerId: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await prisma.player.findUnique({
        where: { playerId },
        select: { id: true, playerId: true },
      });
      if (concurrent !== null) return concurrent;
    }
    throw error;
  }
}
