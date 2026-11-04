import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { PublicBattleStructure } from "./[eventId]/battle-structure";

const ratio = { numerator: 10, denominator: 0 as const, state: "ZERO_DENOMINATOR" as const, value: null, display: "10 K" };

test("public Battle Structure keeps Company structure compact and Player results collapsed", () => {
  const html = renderToStaticMarkup(<PublicBattleStructure
    result="DEFENDER_WIN"
    defenderFlagRef={null}
    attackerFlagRef={null}
    groups={[{
      id: "group",
      name: "1st Brigade",
      side: "DEFENDER",
      participationId: "participation",
      representedUnit: { id: "unit", name: "1st Regiment" },
      commanderPlayerId: "group-commander",
      commanderIdentity: { playerId: "group-commander", robloxUsername: null, robloxAvatarUrl: null },
      children: [],
      atomicUnits: [{
        id: "atomic",
        name: "1st Line Company",
        side: "DEFENDER",
        auditUnitType: "REGULAR",
        isMandatory: true,
        createdAt: new Date("2026-09-28T00:00:00.000Z"),
        persistentUnitId: "unit",
        persistentUnitName: "1st Regiment",
        unitType: "REGULAR",
        representedUnitId: "unit",
        representedUnitName: "1st Regiment",
        resultState: "FINALIZED",
        commanderPlayerId: "player-1",
        commanderIdentity: { playerId: "player-1", robloxUsername: "Adler", robloxAvatarUrl: null },
        commander: "Cmdr. Adler",
        summary: {
          kills: 10,
          deaths: 0,
          assists: 2,
          playerCount: 1,
          averagesPerPlayer: { kills: 10, deaths: 0, assists: 2 },
          kdr: ratio,
          tickets: 4,
          flagCaptures: 1,
          flagLosses: 0,
          stars: 2,
        },
        players: [{ position: 1, playerId: "player-1", robloxUsername: "Adler", robloxAvatarUrl: null, role: "COMMANDER", kills: 10, deaths: 0, assists: 2, kdr: ratio }],
      }],
    }]}
    ungroupedAtomicUnits={[]}
    unitImageRefs={{ unit: "/icons/regiment-test.png" }}
  />);
  assert.match(html, /Defenders won/);
  assert.match(html, /10 K/);
  assert.match(html, /K\/D/);
  assert.match(html, /Participating Players/);
  assert.match(html, /Commander/);
  assert.match(html, /Adler/);
  assert.match(html, /<details class="mt-2 border-t border-edge pt-2">/);
  assert.match(html, /href="\/units\/unit"/);
  assert.match(html, /href="\/players\/group-commander"/);
  assert.match(html, /href="\/players\/player-1"/);
  assert.match(html, /src="\/icons\/regiment-test.png"/);
  assert.doesNotMatch(html, /Atomic Unit|Battle Statistics/);
  assert.doesNotMatch(html, /Company Statistics|Tickets|Captures|Stars/);
  assert.doesNotMatch(html, /Manage event|Move to/);
});
