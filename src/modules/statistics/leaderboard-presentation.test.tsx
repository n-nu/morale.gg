import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { parseLeaderboardQuery, type LeaderboardData, type LeaderboardQuery } from "./leaderboard-model";
import { LeaderboardView } from "./leaderboard-presentation";
import { deriveRatio } from "./ratios";

function playersData(): LeaderboardData {
  const row = (gamePlayerId: string, displayName: string, kills: number, deaths: number) => ({
    subject: { kind: "player" as const, gamePlayerId, displayName },
    metrics: {
      audits: { kind: "count" as const, value: 2 },
      kills: { kind: "count" as const, value: kills },
      deaths: { kind: "count" as const, value: deaths },
      assists: { kind: "count" as const, value: 1 },
      kd: { kind: "ratio" as const, ratio: deriveRatio(kills, deaths, "K") },
      kad: { kind: "ratio" as const, ratio: deriveRatio(kills + 1, deaths, "K+A") },
      killsPerAudit: { kind: "average" as const, value: kills / 2 },
    },
  });
  return {
    window: "14d",
    board: "players",
    partitions: [
      {
        unitType: "REGULAR",
        rows: [
          row("game/1", "Marshal Ney", 31, 15),
          row("game-2", "game-2", 18, 0),
          row("game-3", "Kellermann", 9, 4),
          row("game-4", "Murat", 2, 6),
        ],
      },
      { unitType: "RIFLES", rows: [row("game-5", "Rifleman", 4, 1)] },
      { unitType: "CAVALRY", rows: [] },
      { unitType: "ARTILLERY", rows: [] },
    ],
  };
}

function render(query: Partial<LeaderboardQuery>, data: LeaderboardData = playersData()) {
  const base = parseLeaderboardQuery({});
  return renderToStaticMarkup(<LeaderboardView query={{ ...base, unitType: "REGULAR", ...query }} data={data} />);
}

test("the initial view states the ranking, branch, window, and population", () => {
  const html = render({});
  assert.match(html, /Ranked by <span[^>]*>K<\/span> \(highest first\)/);
  assert.match(html, /Regular<\/span> · last 14 days · <span class="tabular-nums">4<\/span> players/);
  assert.match(html, /How rankings work/);
});

test("rows link to public Player routes with encoded game IDs and show the ID only beside a real name", () => {
  const html = render({});
  assert.match(html, /href="\/players\/game%2F1"/);
  assert.match(html, />Marshal Ney</);
  assert.match(html, /font-mono[^>]*>game\/1</);
  assert.equal((html.match(/>game-2</g) ?? []).length, 1, "the fallback name is not repeated as a second line");
});

test("ratios render rounded with raw totals, and zero deaths keep the approved form", () => {
  const html = render({ sort: "kd" });
  assert.match(html, /title="31 ÷ 15"[^>]*>2\.07</);
  assert.match(html, /title="18 ÷ 0, no deaths"[^>]*>18 K</);
  assert.doesNotMatch(html, /2\.0666/);
});

test("sorting by K/D ranks the zero-death player first and marks the podium", () => {
  const html = render({ sort: "kd" });
  const order = [...html.matchAll(/href="\/players\/([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(order, ["game-2", "game-3", "game%2F1", "game-4"], "18 K, then 9 ÷ 4 = 2.25, then 31 ÷ 15 ≈ 2.07");
  assert.match(html, /shadow-\[inset_3px_0_0_var\(--gold\)\] text-gold[^>]*>1</);
  assert.match(html, /text-bronze[^>]*>3</);
  assert.equal((html.match(/inset_3px_0_0/g) ?? []).length, 1, "only the leader row carries an edge bar");
});

test("sortable headers expose aria-sort and toggle direction through links", () => {
  const html = render({ sort: "kills", dir: "desc" });
  assert.match(html, /aria-sort="descending"[^>]*><a [^>]*href="\/leaderboard\?type=regular&amp;dir=asc"/);
  assert.match(html, /<a [^>]*href="\/leaderboard\?type=regular&amp;sort=kd"/);
  const ascending = render({ sort: "kills", dir: "asc" });
  assert.match(ascending, /aria-sort="ascending"/);
  assert.match(ascending, /\(lowest first\)/);
});

test("branch filter shows per-branch counts and the active branch", () => {
  const html = render({});
  assert.match(html, /aria-current="true"[^>]*>Regular<span[^>]*>4<\/span>/);
  assert.match(html, /href="\/leaderboard\?type=rifles"[^>]*>Rifles<span[^>]*>1<\/span>/);
  assert.match(html, /href="\/leaderboard\?type=artillery"[^>]*>Artillery<span[^>]*>0<\/span>/);
});

test("an empty branch explains itself and offers the other windows", () => {
  const html = render({ unitType: "CAVALRY" });
  assert.match(html, /No Cavalry players with finalized results in the last 14 days\./);
  assert.match(html, /href="\/leaderboard\?window=30d&amp;type=cavalry"[^>]*>last 30 days</);
  assert.match(html, /href="\/leaderboard\?window=all-time&amp;type=cavalry"[^>]*>all time</);
  assert.doesNotMatch(html, /<table/);
  assert.match(render({ unitType: "CAVALRY", window: "all-time" }), /finalized results on record\./);
});

test("Generals have no branch filter and Units link to the public Unit route", () => {
  const generals = render({ board: "generals", sort: "commands", unitType: null }, {
    window: "14d",
    board: "generals",
    partitions: [{ unitType: null, rows: [{ subject: { kind: "player", gamePlayerId: "g-1", displayName: "Davout" }, metrics: { commands: { kind: "count", value: 3 } } }] }],
  });
  assert.doesNotMatch(generals, /aria-label="Branch"/);
  assert.match(generals, />Davout</);

  const units = render({ board: "units", sort: "kd" }, {
    window: "14d",
    board: "units",
    partitions: [{ unitType: "REGULAR", rows: [{ subject: { kind: "unit", unitId: "unit 1", unitName: "42nd Highland" }, metrics: { kd: { kind: "ratio", ratio: deriveRatio(13, 2, "K") } } }] }],
  });
  assert.match(units, /href="\/units\/unit%201"[^>]*>42nd Highland</);
  assert.match(units, />6\.5</);
});

test("responsive structure: the table scrolls locally with sticky rank and name columns", () => {
  const html = render({});
  assert.match(html, /data-testid="leaderboard-scroll"/);
  assert.match(html, /class="overflow-x-auto border-y border-edge"/);
  assert.match(html, /<th scope="col" class="sticky left-0 z-10 w-12 min-w-12 /, "the rank column is at least as wide as the name column's sticky offset");
  assert.match(html, /<td class="sticky left-0 z-10 w-12 min-w-12 /);
  assert.match(html, /<th scope="row" class="sticky left-12/);
  assert.match(html, /<nav aria-label="Leaderboard boards"[^>]*><ul class="-mb-px flex gap-4 overflow-x-auto sm:gap-6">/);
});
