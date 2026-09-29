import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import type { PublicEventCommandGroup } from "@/modules/audits/server/command-groups";

import { PublicBattleStructure } from "./battle-structure";

test("public Battle Structure renders atomic placeholders without manager or Unsorted data", () => {
  const group: PublicEventCommandGroup = {
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
      persistentUnitName: "First Regiment",
      unitType: null,
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