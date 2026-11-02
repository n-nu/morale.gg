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
    representedUnit: { id: "", name: "First Regiment" },
    commanderPlayerId: "GroupCommander",
    atomicUnits: [{
      id: "private-atomic-id",
      name: "1st Infantry Company",
      side: "DEFENDER",
      auditUnitType: "REGULAR",
      isMandatory: true,
      createdAt: new Date("2026-09-28T00:00:00.000Z"),
      persistentUnitId: "private-unit-id",
      persistentUnitName: "First Regiment",
      unitType: null,
      representedUnitId: "",
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
  assert.match(html, /Company/);
  assert.match(html, /Command Group/);
  assert.match(html, /Company statistics and participating players/);
  assert.match(html, /Company Statistics/);
  assert.match(html, /Participating Players/);
  assert.match(html, /Results pending/);
  assert.match(html, /Commander pending Audit/);
  assert.match(html, /aria-label="First Regiment Unit icon"/);
  assert.match(html, /lg:grid-cols-2/);
  assert.match(html, /Jump to Attackers/);
  assert.match(html, /Jump to Defenders/);
  assert.doesNotMatch(html, /Unsorted|Command structure|Move to|Manage event/);
  assert.doesNotMatch(html, /Atomic Unit|Atomic Units/);
  assert.doesNotMatch(html, /private-(?:group|participation|unit|atomic)-id/);
});

test("public Battle Structure preserves the unconfigured empty state", () => {
  const html = renderToStaticMarkup(<PublicBattleStructure
    result={null}
    defenderFlagRef={null}
    attackerFlagRef={null}
    groups={[]}
    ungroupedAtomicUnits={[]}
  />);

  assert.match(html, /Battle sides not configured/);
  assert.match(html, /Not recorded/);
  assert.doesNotMatch(html, /Jump to Attackers/);
});

test("public Battle Structure gives empty sides and Command Groups explicit states", () => {
  const html = renderToStaticMarkup(<PublicBattleStructure
    result="DRAW"
    defenderFlagRef={null}
    attackerFlagRef={null}
    groups={[{
      id: "empty-group",
      name: "Reserve Group",
      side: "DEFENDER",
      participationId: "participation",
      representedUnit: { id: "", name: "Reserve Unit" },
      commanderPlayerId: "public-player",
      atomicUnits: [],
      children: [],
    }]}
    ungroupedAtomicUnits={[]}
  />);

  assert.match(html, /This Command Group has no Companies or child Command Groups/);
  assert.match(html, /No Companies or Command Groups are assigned to this side/);
  assert.match(html, /Draw/);
  assert.doesNotMatch(html, /0 Kills|0 Deaths|0 Assists/);
});