import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayerDirectory } from "./directory";

test("Player directory links use stable public PlayerIDs", () => {
  const html = renderToStaticMarkup(<PlayerDirectory players={[
    { playerId: "demo-player-001", robloxUsername: "PlayerOne", robloxAvatarUrl: null },
    { playerId: "demo-player-002", robloxUsername: null, robloxAvatarUrl: null },
  ]} />);

  assert.match(html, /href="\/players\/demo-player-001"/);
  assert.match(html, /href="\/players\/demo-player-002"/);
  assert.match(html, /@PlayerOne/);
  assert.match(html, /Roblox ID: demo-player-002/);
  assert.doesNotMatch(html, /player-row-uuid-123/);
});