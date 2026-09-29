import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import type { EventBattleGroup } from "@/modules/statistics/event-battle";

import { PublicBattleStructure } from "./battle-structure";

test("public Battle Structure renders atomic placeholders without manager or Unsorted data", () => {
  const group: EventBattleGroup = {
    id: "private-group-database-id",
    name: "I Corps",
    side: "DEFENDER",
    participationId: "private-participation-id",
    representedUnit: { id: "private-unit-id", name: "First Regiment" },
    commanderPlayerId: "Adler",
    atomicUnits: [{
      id: "private-atomic-id",
      name: "1st Infantry",
      side: "DEFENDER",
      auditUnitType: "REGULAR",
      isMandatory: true,
      createdAt: new Date("2026-09-28T00:00:00.000Z"),
      persistentUnitId: "private-unit-id",
      persistentUnitName: "First Regiment",
      unitType: null,
      representedUnitId: "private-unit-id",
      representedUnitName: "First Regiment",
      resultState: "PENDING",
      commander: null,
      summary: null,
      players: [],
    }],
    children: [],
  };
  const html = renderToStaticMarkup(<PublicBattleStructure
    result={null}
    defenderFlagRef={null}
    attackerFlagRef={null}
    groups={[group]}
    ungroupedAtomicUnits={[]}
  />);

  assert.match(html, /Battle Structure/);
  assert.match(html, /Defenders/);
  assert.match(html, /Attackers/);
  assert.match(html, /Battle details/);
  assert.match(html, /Unit Statistics/);
  assert.match(html, /Participating Players/);
  assert.match(html, /Results pending/);
  assert.match(html, /lg:grid-cols-2/);
  assert.doesNotMatch(html, /Unsorted|Command structure|Move to|Manage event/);
  assert.doesNotMatch(html, /private-(?:group|participation|unit|atomic)-id/);
});