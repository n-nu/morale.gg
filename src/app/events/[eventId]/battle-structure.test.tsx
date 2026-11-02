import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import type { EventBattleGroup } from "@/modules/statistics/event-battle";

import { PublicBattleStructure, PublicEventStatistics } from "./battle-structure";

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
  assert.match(html, /Participating Players/);
  assert.match(html, /Results pending/);
  assert.match(html, /Commander pending Audit/);
  assert.match(html, /aria-label="First Regiment Unit icon"/);
  assert.match(html, /lg:grid-cols-2/);
  assert.match(html, /Jump to Attackers/);
  assert.match(html, /Jump to Defenders/);
  assert.doesNotMatch(html, /Event result|Not recorded|Winner|Loss|Draw|data-outcome=/);
  assert.doesNotMatch(html, /Company Statistics/);
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
  assert.doesNotMatch(html, /Not recorded|Event result|Winner|Loss|Draw/);
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
  assert.equal((html.match(/data-outcome="draw"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /0 Kills|0 Deaths|0 Assists/);
});

test("public Battle Structure marks the winning and losing side without relying on color alone", () => {
  for (const [result, winnerSide] of [
    ["ATTACKER_WIN", "attacker"],
    ["DEFENDER_WIN", "defender"],
  ] as const) {
    const html = renderToStaticMarkup(<PublicBattleStructure
      result={result}
      defenderFlagRef={null}
      attackerFlagRef={null}
      groups={[
        {
          id: "attacker-group",
          name: "Attacker Group",
          side: "ATTACKER",
          participationId: "attacker-participation",
          representedUnit: { id: "", name: "Attacker Unit" },
          commanderPlayerId: "attacker-commander",
          atomicUnits: [],
          children: [],
        },
        {
          id: "defender-group",
          name: "Defender Group",
          side: "DEFENDER",
          participationId: "defender-participation",
          representedUnit: { id: "", name: "Defender Unit" },
          commanderPlayerId: "defender-commander",
          atomicUnits: [],
          children: [],
        },
      ]}
      ungroupedAtomicUnits={[]}
    />);
    const loserSide = winnerSide === "attacker" ? "defender" : "attacker";

    assert.match(html, new RegExp(`id="battle-${winnerSide}s"[^>]*data-outcome="winner"`));
    assert.match(html, new RegExp(`id="battle-${loserSide}s"[^>]*data-outcome="loss"`));
    assert.match(html, /Event result: <strong[^>]*>(Attackers won|Defenders won)<\/strong>/);
    assert.match(html, />Winner</);
    assert.match(html, />Loss</);
  }
});

test("public Unit leaderboard orders metrics and keeps per-Player averages secondary", () => {
  const finalizedUnit = {
    id: "company-id",
    name: "First Company",
    side: "ATTACKER",
    auditUnitType: "REGULAR",
    isMandatory: true,
    createdAt: new Date("2026-09-28T00:00:00.000Z"),
    persistentUnitId: "unit-id",
    persistentUnitName: "First Regiment",
    unitType: null,
    representedUnitId: "unit-id",
    representedUnitName: "First Regiment",
    resultState: "FINALIZED",
    commander: null,
    summary: {
      kills: 24,
      deaths: 18,
      assists: 11,
      playerCount: 6,
      averagesPerPlayer: { kills: 4, deaths: 3, assists: 1.83 },
      kdr: { numerator: 24, denominator: 18, state: "RATIO", value: 24 / 18, display: "1.3333333333333333" },
      tickets: 152,
      flagCaptures: 7,
      flagLosses: 2,
      stars: 3,
    },
    players: [],
  } satisfies import("@/modules/statistics/event-battle").EventBattleAtomicUnit;
  const html = renderToStaticMarkup(<PublicEventStatistics
    groups={[]}
    ungroupedAtomicUnits={[finalizedUnit]}
    sideSummaries={{
      ATTACKER: {
        kdr: { numerator: 24, denominator: 18, state: "RATIO", value: 24 / 18, display: "1.3333333333333333" },
        tickets: 152,
        flagCaptures: 7,
      },
      DEFENDER: null,
    }}
  />);
  const headers = [...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1]);

  assert.deepEqual(headers, [
    "Unit",
    "Side",
    "Player Count",
    "Kills",
    "Deaths",
    "Assists",
    "K/D",
    "Flag Captures",
    "Flag Losses",
    "Stars",
  ]);
  assert.match(html, /avg 4 \/ player/);
  assert.match(html, /avg 3 \/ player/);
  assert.match(html, /avg 1\.83 \/ player/);
  assert.match(html, /per finalized Player appearance/);
  assert.ok(html.indexOf("Tickets") < html.indexOf("K/D"));
  assert.ok(html.indexOf("K/D") < html.indexOf("Flag Captures"));
  assert.match(html, /pooled kills ÷ deaths/);
  assert.doesNotMatch(html, /Company Statistics/);
});