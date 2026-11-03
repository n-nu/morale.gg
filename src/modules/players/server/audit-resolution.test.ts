import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  AuditPlayerResolutionError,
  previewAuditPlayerIdentities,
  resolveOrCreatePlayerByGameId,
} from "./audit-resolution";

const originalFindMany = prisma.player.findMany;
const originalUpsert = prisma.player.upsert;
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

test.after(() => {
  Object.defineProperty(prisma.player, "findMany", { configurable: true, value: originalFindMany });
  Object.defineProperty(prisma.player, "upsert", { configurable: true, value: originalUpsert });
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

test("resolves an existing Player without changing roster data", async () => {
  let created = false;
  Object.defineProperty(prisma.player, "findMany", {
    configurable: true,
    value: async () => [{ id: "player-1", playerId: "42" }],
  });
  Object.defineProperty(prisma.player, "upsert", {
    configurable: true,
    value: async () => {
      created = true;
      throw new Error("must not create an existing Player");
    },
  });

  assert.deepEqual(await resolveOrCreatePlayerByGameId(" 42 "), {
    id: "player-1",
    playerId: "42",
  });
  assert.equal(created, false);
});

test("creates identity-only Players with no name", async () => {
  const players = new Map<string, { id: string; playerId: string }>();
  Object.defineProperty(prisma.player, "findMany", {
    configurable: true,
    value: async ({ where }: { where: { playerId: { in: string[] } } }) =>
      where.playerId.in.flatMap((playerId) => {
        const player = players.get(playerId);
        return player ? [player] : [];
      }),
  });
  Object.defineProperty(prisma.player, "upsert", {
    configurable: true,
    value: async ({ where, create }: {
      where: { playerId: string };
      create: {
        playerId: string;
        name: null;
        robloxUsername: string;
        robloxAvatarUrl: string | null;
        robloxSyncedAt: Date;
      };
    }) => {
      assert.equal(create.name, null);
      assert.equal(create.robloxUsername, "RobloxUser");
      players.set(where.playerId, { id: "player-2", playerId: create.playerId });
      return players.get(where.playerId);
    },
  });
  globalThis.fetch = async (input) => {
    const url = String(input);
    return new Response(JSON.stringify(url.includes("users.roblox.com")
      ? { data: [{ id: 84, name: "RobloxUser", displayName: "Ignored display name" }] }
      : { data: [{ targetId: 84, imageUrl: "https://tr.rbxcdn.com/avatar.png" }] }), { status: 200 });
  };

  assert.deepEqual(await resolveOrCreatePlayerByGameId("84"), {
    id: "player-2",
    playerId: "84",
  });
});

test("Audit preview keeps existing legacy Player IDs usable without Roblox", async () => {
  let fetchCount = 0;
  Object.defineProperty(prisma.player, "findMany", {
    configurable: true,
    value: async () => [{
      playerId: "legacy-player-key",
      robloxUsername: null,
      robloxAvatarUrl: null,
      robloxSyncedAt: null,
    }],
  });
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("Roblox should not be called for a legacy ID");
  };

  const preview = await previewAuditPlayerIdentities(["legacy-player-key"]);
  assert.deepEqual(preview, {
    players: [{
      playerId: "legacy-player-key",
      robloxUsername: null,
      robloxAvatarUrl: null,
      existing: true,
      verified: false,
    }],
    invalidIds: [],
    unavailable: false,
  });
  assert.equal(fetchCount, 0);
});

test("Audit preview blocks new IDs when Roblox is unavailable", async () => {
  Object.defineProperty(prisma.player, "findMany", {
    configurable: true,
    value: async () => [],
  });
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  await assert.rejects(
    previewAuditPlayerIdentities(["123"]),
    (error: unknown) =>
      error instanceof AuditPlayerResolutionError &&
      error.message.includes("verify new Audit Player IDs"),
  );
});
