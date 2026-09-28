import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayerStatisticsSections } from "./player-presentation";

const ranker = {
  gamePlayerId: "game-1",
  distinctEvents: 4,
  unitTypes: [{
    unitType: "REGULAR" as const,
    totals: { kills: 12, deaths: 4, assists: 8 },
    averagesPerAuditAppearance: { kills: 3, deaths: 1, assists: 2 },
    killDeathRatio: { numerator: 12, denominator: 4, state: "RATIO" as const, value: 3, display: "3" },
    killAssistDeathRatio: { numerator: 20, denominator: 4, state: "RATIO" as const, value: 5, display: "5" },
    auditAppearances: 4,
  }],
};

test("Player Statistics expose a compact Ranker summary and collapsed details", () => {
  const html = renderToStaticMarkup(<PlayerStatisticsSections ranker={ranker} window="14d" />);

  assert.match(html, /Ranker/);
  assert.match(html, />K</);
  assert.match(html, />D</);
  assert.match(html, />A</);
  assert.match(html, />KDR</);
  assert.match(html, />Events</);
  assert.match(html, />12</);
  assert.match(html, /Show Ranker details/);
  assert.match(html, /<details class="group border-t border-edge\/70">/);
  assert.match(html, /\(K\+A\)\/D/);
  assert.match(html, /Regular/);
  assert.match(html, /14d/);
});

test("Player Statistics retain an explicit empty state", () => {
  const html = renderToStaticMarkup(<PlayerStatisticsSections window="14d" />);
  assert.match(html, /No statistics in this window/);
});

test("Commander and General remain collapsed and retain their returned fields", () => {
  const commander = {
    gamePlayerId: "game-1",
    unitTypes: [{
      unitType: "REGULAR" as const,
      battlesCommanded: 2,
      totals: { kills: 12, deaths: 4, assists: 8, tickets: 50, flagCaptures: 3, flagLosses: 1, stars: 2 },
      killDeathRatio: { numerator: 12, denominator: 4, state: "RATIO" as const, value: 3, display: "3" },
      averagesPerBattle: { kills: 6, deaths: 2, assists: 4, tickets: 25, flagCaptures: 1.5, flagLosses: 0.5, stars: 1, playerCount: 24, value: 0 },
      averageKillDeathRatio: { numerator: 12, denominator: 4, state: "RATIO" as const, value: 3, display: "3" },
    }],
  };
  const general = {
    gamePlayerId: "game-1",
    qualifyingGroupsCommanded: 1,
    distinctEventsCommanded: 1,
    totalAtomicUnitsCommanded: 2,
    atomicUnitsByType: { REGULAR: 2, RIFLES: 0, CAVALRY: 0, ARTILLERY: 0 },
    combatByType: [{
      unitType: "REGULAR" as const,
      atomicUnits: 2,
      totals: { kills: 10, deaths: 5, assists: 4, tickets: 8, flagCaptures: 2, flagLosses: 1, stars: 3 },
      killDeathRatio: { numerator: 10, denominator: 5, state: "RATIO" as const, value: 2, display: "2" },
      averagesPerAtomicUnit: { kills: 5, deaths: 2.5, assists: 2, tickets: 4, flagCaptures: 1, flagLosses: 0.5, stars: 1.5, playerCount: 20 },
    }],
  };
  const html = renderToStaticMarkup(<PlayerStatisticsSections commander={commander} general={general} window="30d" />);

  assert.match(html, /2 Regular battles/);
  assert.match(html, /1 qualifying commands · 1 events · 2 atomic units/);
  assert.match(html, /Avg tickets\/unit/);
  assert.match(html, /Avg players\/unit/);
  assert.equal((html.match(/<details class="group border-t border-edge\/70">/g) ?? []).length, 2);
});