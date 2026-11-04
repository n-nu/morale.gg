import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayerStatisticsSections } from "./player-presentation";
import type { PlayerProfileStatistics } from "./player-profile";

const emptyHistory = {
  rows: [],
  page: 1,
  pageSize: 50,
  totalRows: 0,
  pageCount: 0,
};

const emptyStatistics: PlayerProfileStatistics = {
  gamePlayerId: "game-1",
  window: "14d",
  unitType: null,
  playerSummary: [],
  playerHistory: emptyHistory,
  commanderSummary: [],
  commanderHistory: emptyHistory,
  generalSummary: null,
  generalHistory: emptyHistory,
};

test("Ranker tab renders only its summary and history", () => {
  const html = renderToStaticMarkup(
    <PlayerStatisticsSections tab="ranker" statistics={emptyStatistics} events={[]} units={[]} />,
  );

  assert.match(html, /Ranker Performance/);
  assert.doesNotMatch(html, /Commander Performance/);
  assert.doesNotMatch(html, /General Performance/);
  assert.match(html, /No Player activity during this timeframe/);
  assert.match(html, /No Event performance during this timeframe/);
});

test("Commander and General tabs each render only the selected performance section", () => {
  const commander = renderToStaticMarkup(
    <PlayerStatisticsSections tab="commander" statistics={emptyStatistics} events={[]} units={[]} />,
  );
  assert.match(commander, /Commander Performance/);
  assert.match(commander, /No Commander activity during this timeframe/);
  assert.doesNotMatch(commander, /Ranker Performance|General Performance/);

  const general = renderToStaticMarkup(
    <PlayerStatisticsSections tab="general" statistics={emptyStatistics} events={[]} units={[]} />,
  );
  assert.match(general, /General Performance/);
  assert.match(general, /No General activity during this timeframe/);
  assert.doesNotMatch(general, /Ranker Performance|Commander Performance/);
});

test("history pagination preserves profile filters and uses independent page parameters", () => {
  const statistics: PlayerProfileStatistics = {
    ...emptyStatistics,
    unitType: "REGULAR",
    playerHistory: {
      rows: [{
        auditId: "audit-1",
        eventId: "event-1",
        occurredAt: new Date("2026-10-01T12:00:00.000Z"),
        unitId: "unit-1",
        unitName: "Example Unit",
        unitType: "REGULAR",
        kills: 4,
        deaths: 2,
        assists: 1,
        killDeathRatio: { numerator: 4, denominator: 2, state: "RATIO", value: 2, display: "2" },
        killAssistDeathRatio: { numerator: 5, denominator: 2, state: "RATIO", value: 2.5, display: "2.5" },
      }],
      page: 1,
      pageSize: 50,
      totalRows: 51,
      pageCount: 2,
    },
  };
  const html = renderToStaticMarkup(
    <PlayerStatisticsSections tab="ranker" statistics={statistics} events={[]} units={[]} />,
  );

  assert.match(html, /Showing 1–50 of 51/);
  assert.match(html, /\/players\/game-1\?window=14d&amp;type=regular&amp;playerPage=2/);
  assert.match(html, /Older/);
  assert.match(html, /Example Unit/);
  assert.match(html, /Event event-1/);
});
