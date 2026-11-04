import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayerIdentity } from "./player-identity";

test("stacked Player identity keeps the avatar prominent and username discreet", () => {
  const html = renderToStaticMarkup(
    <PlayerIdentity
      identity={{
        playerId: "123456789",
        robloxUsername: "ExampleUser",
        robloxAvatarUrl: "https://tr.rbxcdn.com/avatar.png",
      }}
      size={152}
      showPlayerId
      layout="stacked"
    />,
  );

  assert.match(html, /flex-col items-center/);
  assert.match(html, /width:152px;height:152px/);
  assert.match(html, /text-sm font-medium text-muted/);
  assert.match(html, /@ExampleUser/);
  assert.match(html, /Roblox ID: 123456789/);
  assert.match(html, /Roblox avatar for @ExampleUser/);
});

test("stacked Player identity uses the neutral fallback and canonical ID", () => {
  const html = renderToStaticMarkup(
    <PlayerIdentity
      identity={{ playerId: "987654321", robloxUsername: null, robloxAvatarUrl: null }}
      size={128}
      showPlayerId
      layout="stacked"
    />,
  );

  assert.match(html, /Player avatar unavailable/);
  assert.match(html, /Roblox ID 987654321/);
  assert.doesNotMatch(html, /Auth\.js|Google/);
});
