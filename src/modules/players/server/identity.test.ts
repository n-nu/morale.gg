import assert from "node:assert/strict";
import test from "node:test";

import {
  backfillRobloxIdentityBatch,
  isRobloxIdentityStale,
  refreshStaleRobloxIdentity,
  resolveOrCreatePlayersByGameIds,
} from "./identity";
import { RobloxLookupError, type RobloxIdentity } from "./roblox";

type PlayerRecord = {
  id: string;
  playerId: string;
  name: string | null;
  robloxUsername: string | null;
  robloxAvatarUrl: string | null;
  robloxSyncedAt: Date | null;
};

function fakeDatabase(initial: PlayerRecord[] = []) {
  const rows = new Map(initial.map((player) => [player.playerId, player]));
  const upserted: Array<{ create: Omit<PlayerRecord, "id">; update: Partial<PlayerRecord> }> = [];
  const updated: Array<{ playerId: string; data: Partial<PlayerRecord> }> = [];
  const db = {
    player: {
      findMany: async ({
        where,
        select,
      }: {
        where: { playerId: { in: string[] } };
        select: Record<string, boolean>;
      }) => where.playerId.in.flatMap((playerId) => {
        const player = rows.get(playerId);
        if (!player) return [];
        return [select.id
          ? { id: player.id, playerId: player.playerId }
          : { playerId: player.playerId }];
      }),
      findUnique: async ({ where }: { where: { playerId: string } }) => rows.get(where.playerId) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { playerId: string };
        create: Omit<PlayerRecord, "id">;
        update: Partial<PlayerRecord>;
      }) => {
        upserted.push({ create, update });
        const previous = rows.get(where.playerId);
        const player = previous
          ? { ...previous, ...update }
          : { ...create, id: `player-${create.playerId}` };
        rows.set(where.playerId, player);
        return player;
      },
      update: async ({
        where,
        data,
      }: {
        where: { playerId: string };
        data: Partial<PlayerRecord>;
      }) => {
        updated.push({ playerId: where.playerId, data });
        const previous = rows.get(where.playerId);
        if (!previous) throw new Error("Player not found");
        const player = { ...previous, ...data };
        rows.set(where.playerId, player);
        return player;
      },
    },
  };
  return { db, rows, upserted, updated };
}

test("existing legacy Player IDs resolve without a Roblox request", async () => {
  const existing: PlayerRecord = {
    id: "internal-1",
    playerId: "legacy-player-key",
    name: "Old name",
    robloxUsername: null,
    robloxAvatarUrl: null,
    robloxSyncedAt: null,
  };
  const { db, upserted } = fakeDatabase([existing]);
  const lookup = async (): Promise<{ identities: RobloxIdentity[]; invalidIds: string[] }> => {
    throw new Error("existing Players must not require Roblox");
  };

  assert.deepEqual(
    await resolveOrCreatePlayersByGameIds([" legacy-player-key "], db as never, lookup),
    [{ id: "internal-1", playerId: "legacy-player-key" }],
  );
  assert.equal(upserted.length, 0);
});

test("cached identity becomes stale at fourteen days and refreshes changed usernames", async () => {
  const syncedAt = new Date("2026-10-01T00:00:00.000Z");
  assert.equal(isRobloxIdentityStale(syncedAt, new Date(syncedAt.getTime() + 14 * 24 * 60 * 60 * 1000 - 1)), false);
  assert.equal(isRobloxIdentityStale(syncedAt, new Date(syncedAt.getTime() + 14 * 24 * 60 * 60 * 1000)), true);
  assert.equal(isRobloxIdentityStale(null, new Date()), true);

  const existing: PlayerRecord = {
    id: "internal-123",
    playerId: "123",
    name: null,
    robloxUsername: "OldName",
    robloxAvatarUrl: null,
    robloxSyncedAt: syncedAt,
  };
  const { db, updated } = fakeDatabase([existing]);
  const now = new Date(syncedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
  const refreshed = await refreshStaleRobloxIdentity(
    "123",
    db as never,
    async (playerIds) => ({
      identities: playerIds.map((playerId) => ({
        playerId,
        robloxUsername: "NewName",
        robloxAvatarUrl: "https://tr.rbxcdn.com/new.png",
      })),
      invalidIds: [],
    }),
    () => now,
  );

  assert.equal(refreshed?.robloxUsername, "NewName");
  assert.equal(refreshed?.robloxAvatarUrl, "https://tr.rbxcdn.com/new.png");
  assert.equal(refreshed?.robloxSyncedAt, now);
  assert.equal(updated.length, 1);
});

test("new Players are created only after verified Roblox identity is fetched", async () => {
  const { db, rows, upserted } = fakeDatabase();
  const now = new Date("2026-11-03T00:00:00.000Z");
  const lookup = async (playerIds: string[]) => ({
    identities: playerIds.map((playerId) => ({
      playerId,
      robloxUsername: "VerifiedName",
      robloxAvatarUrl: "https://tr.rbxcdn.com/avatar.png",
    })),
    invalidIds: [],
  });

  assert.deepEqual(
    await resolveOrCreatePlayersByGameIds(["123"], db as never, lookup, () => now),
    [{ id: "player-123", playerId: "123" }],
  );
  assert.deepEqual(upserted[0], {
    create: {
      playerId: "123",
      name: null,
      robloxUsername: "VerifiedName",
      robloxAvatarUrl: "https://tr.rbxcdn.com/avatar.png",
      robloxSyncedAt: now,
    },
    update: {
      robloxUsername: "VerifiedName",
      robloxAvatarUrl: "https://tr.rbxcdn.com/avatar.png",
      robloxSyncedAt: now,
    },
  });
  assert.equal(rows.get("123")?.name, null);
});

test("new nonnumeric IDs fail validation before Roblox lookup or persistence", async () => {
  const { db, upserted } = fakeDatabase();
  let lookedUp = false;
  await assert.rejects(
    resolveOrCreatePlayersByGameIds(["new-legacy-id"], db as never, async () => {
      lookedUp = true;
      return { identities: [], invalidIds: [] };
    }),
    RobloxLookupError,
  );
  assert.equal(lookedUp, false);
  assert.equal(upserted.length, 0);
});

test("manual backfill updates only existing Players and reports unverified IDs", async () => {
  const existing: PlayerRecord = {
    id: "internal-1",
    playerId: "123",
    name: "Legacy value",
    robloxUsername: null,
    robloxAvatarUrl: null,
    robloxSyncedAt: null,
  };
  const { db, rows, updated } = fakeDatabase([existing]);
  const now = new Date("2026-11-03T00:00:00.000Z");

  const result = await backfillRobloxIdentityBatch(
    ["123", "456"],
    db as never,
    async () => ({
      identities: [{
        playerId: "123",
        robloxUsername: "VerifiedName",
        robloxAvatarUrl: null,
      }],
      invalidIds: ["456"],
    }),
    () => now,
  );

  assert.deepEqual(result, { updated: 1, invalidIds: ["456"] });
  assert.deepEqual(updated, [{
    playerId: "123",
    data: {
      robloxUsername: "VerifiedName",
      robloxAvatarUrl: null,
      robloxSyncedAt: now,
    },
  }]);
  assert.equal(rows.get("123")?.name, "Legacy value");
});
