import assert from "node:assert/strict";
import test from "node:test";

import { robloxProfileUrl, safeRobloxAvatarUrl } from "../identity";
import { normalizeRobloxPlayerId, RobloxLookupError, lookupRobloxIdentities } from "./roblox";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status });
}

test("Roblox User IDs require canonical positive safe integers", () => {
  assert.equal(normalizeRobloxPlayerId(" 123 "), "123");
  for (const value of ["", "0", "0123", "-1", "1.5", "9007199254740992", "old-player-id"]) {
    assert.throws(() => normalizeRobloxPlayerId(value), RobloxLookupError, value);
  }
});

test("Roblox lookup uses username fields and accepts only safe CDN headshots", async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    requests.push({ url, init });
    if (url.hostname === "users.roblox.com") {
      return jsonResponse({
        data: [
          { id: 123, name: "RobloxName", displayName: "Ignored Display Name" },
          { id: 456, name: "SecondName", displayName: "Also Ignored" },
        ],
      });
    }
    return jsonResponse({
      data: [
        { targetId: 123, imageUrl: "https://tr.rbxcdn.com/avatar-123.png" },
        { targetId: 456, imageUrl: "https://example.test/not-roblox.png" },
      ],
    });
  };

  const result = await lookupRobloxIdentities(["123", "456", "123"], fetcher);

  assert.deepEqual(result, {
    identities: [
      { playerId: "123", robloxUsername: "RobloxName", robloxAvatarUrl: "https://tr.rbxcdn.com/avatar-123.png" },
      { playerId: "456", robloxUsername: "SecondName", robloxAvatarUrl: null },
    ],
    invalidIds: [],
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.pathname, "/v1/users");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
    userIds: [123, 456],
    excludeBannedUsers: false,
  });
  assert.equal(requests[1].url.searchParams.get("userIds"), "123,456");
  assert.equal(requests[0].init.cache, "no-store");
});

test("Roblox lookup batches at the application limit and reports missing IDs", async () => {
  const userBatches: number[][] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "users.roblox.com") {
      const body = JSON.parse(String(init.body)) as { userIds: number[] };
      userBatches.push(body.userIds);
      return jsonResponse({ data: body.userIds.filter((id) => id !== 11).map((id) => ({ id, name: `User${id}` })) });
    }
    return jsonResponse({ data: [] });
  };
  const result = await lookupRobloxIdentities(
    Array.from({ length: 11 }, (_, index) => String(index + 1)),
    fetcher,
  );

  assert.deepEqual(userBatches.map((batch) => batch.length), [10, 1]);
  assert.deepEqual(result.invalidIds, ["11"]);
  assert.equal(result.identities.length, 10);
});

test("Roblox lookup distinguishes unavailable requests from malformed user responses", async () => {
  await assert.rejects(
    lookupRobloxIdentities(["123"], async () => {
      throw new Error("network unavailable");
    }),
    (error: unknown) => error instanceof RobloxLookupError && error.kind === "UNAVAILABLE",
  );
  await assert.rejects(
    lookupRobloxIdentities(["123"], async () => jsonResponse({ unexpected: [] })),
    (error: unknown) => error instanceof RobloxLookupError && error.kind === "MALFORMED",
  );
});

test("avatar validation rejects non-HTTPS and non-Roblox hosts", () => {
  assert.equal(safeRobloxAvatarUrl("http://tr.rbxcdn.com/avatar.png"), null);
  assert.equal(safeRobloxAvatarUrl("https://rbxcdn.com.evil.test/avatar.png"), null);
  assert.equal(safeRobloxAvatarUrl("https://tr.rbxcdn.com/avatar.png"), "https://tr.rbxcdn.com/avatar.png");
});

test("Roblox profile links are emitted only for canonical safe-integer IDs", () => {
  assert.equal(robloxProfileUrl("123"), "https://www.roblox.com/users/123/profile");
  assert.equal(robloxProfileUrl("legacy-player-id"), null);
  assert.equal(robloxProfileUrl("0123"), null);
  assert.equal(robloxProfileUrl("9007199254740992"), null);
});
