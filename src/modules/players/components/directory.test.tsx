import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { playerIdDescription, playerIdentityLabel } from "../identity";
import { PlayerDirectory } from "./directory";

test("Player directory links use stable public PlayerIDs", () => {
  const html = renderToStaticMarkup(<PlayerDirectory players={[
    { playerId: "demo-player-001", robloxUsername: "PlayerOne", robloxAvatarUrl: null },
    { playerId: "demo-player-002", robloxUsername: null, robloxAvatarUrl: null },
  ]} />);

  assert.match(html, /href="\/players\/demo-player-001"/);
  assert.match(html, /href="\/players\/demo-player-002"/);
  assert.match(html, /@PlayerOne/);
  assert.match(html, /Synthetic demo ID: demo-player-002/);
  assert.match(html, /Demo Player 002/);
  assert.doesNotMatch(html, /player-row-uuid-123/);
});

test("Player labels distinguish real numeric Roblox IDs from synthetic demo identities", () => {
  assert.equal(playerIdentityLabel({ playerId: "123456", robloxUsername: null, robloxAvatarUrl: null }), "Roblox ID 123456");
  assert.equal(playerIdentityLabel({ playerId: "demo-player-004", robloxUsername: null, robloxAvatarUrl: null }), "Demo Player 004");
  assert.equal(playerIdentityLabel({ playerId: "demo-player-merc-003", robloxUsername: null, robloxAvatarUrl: null }), "Demo Mercenary 003");
  assert.equal(playerIdentityLabel({ playerId: "demo-player-roster-us-baltimore-hussars-01", robloxUsername: null, robloxAvatarUrl: null }), "Demo Player us-baltimore-hussars 01");
  assert.equal(playerIdDescription("123456"), "Roblox ID: 123456");
  assert.equal(playerIdDescription("demo-player-roster-us-baltimore-hussars-01"), "Synthetic demo ID: demo-player-roster-us-baltimore-hussars-01");
});