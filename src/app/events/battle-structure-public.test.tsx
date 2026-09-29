import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import type { EventBattleGroup } from "@/modules/statistics/event-battle";

import { PublicBattleStructure } from "./[eventId]/battle-structure";

const ratio = { numerator: 10, denominator: 0 as const, state: "ZERO_DENOMINATOR" as const, value: null, display: "10 K" };

function renderBattle() {
  const group: EventBattleGroup = {
    id: "group",
    name: "1st Brigade",
    side: "DEFENDER",
    participationId: "participation",
    representedUnit: { id: "unit", name: "1st Regiment" },
    commanderPlayerId: "group-commander",
    children: [],
    atomicUnits: [{
      id: "atomic",
      name: "1st Line",
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
      commander: "Cmdr. Adler",
      summary: { kills: 10, deaths: 0, assists: 2, kdr: ratio, tickets: 4, flagCaptures: 1, flagLosses: 0, stars: 2 },
      players: [{ position: 1, playerId: "player-1", displayName: "Adler", role: "COMMANDER", kills: 10, deaths: 0, assists: 2, kdr: ratio }],
    }],
  };

  return renderToStaticMarkup(<PublicBattleStructure
    result="DEFENDER_WIN"
    defenderFlagRef={null}
    attackerFlagRef={null}
    groups={[group]}
    ungroupedAtomicUnits={[]}
  />);
}

test("public Battle Structure keeps details collapsed and renders finalized metrics", () => {
  const html = renderBattle();
  assert.match(html, /Victory|DEFENDER_WIN/);
  assert.match(html, /10 K/);
  assert.match(html, /Unit Statistics/);
  assert.match(html, /Participating Players/);
  assert.match(html, /Commander/);
  assert.match(html, /Adler/);
  assert.match(html, /<details class="mt-1"/);
  assert.doesNotMatch(html, /Battle Statistics/);
  assert.doesNotMatch(html, /Manage event|Move to/);
});
