import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { resolveOrCreatePlayerByGameId } from "./audit-resolution";

const originalFindUnique = prisma.player.findUnique;
const originalCreate = prisma.player.create;

test.after(() => {
  Object.defineProperty(prisma.player, "findUnique", { configurable: true, value: originalFindUnique });
  Object.defineProperty(prisma.player, "create", { configurable: true, value: originalCreate });
});

test("resolves an existing Player without changing roster data", async () => {
  let created = false;
  Object.defineProperty(prisma.player, "findUnique", {
    configurable: true,
    value: async () => ({ id: "player-1", playerId: "42" }),
  });
  Object.defineProperty(prisma.player, "create", {
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
  Object.defineProperty(prisma.player, "findUnique", {
    configurable: true,
    value: async () => null,
  });
  Object.defineProperty(prisma.player, "create", {
    configurable: true,
    value: async ({ data }: { data: { playerId: string; name: null } }) => ({
      id: "player-2",
      playerId: data.playerId,
    }),
  });

  assert.deepEqual(await resolveOrCreatePlayerByGameId("84"), {
    id: "player-2",
    playerId: "84",
  });
});
