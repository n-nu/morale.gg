import assert from "node:assert/strict";
import test from "node:test";

import {
  compareLeaderboardMetrics,
  describeRatio,
  formatLeaderboardMetric,
  formatRatio,
  leaderboardHref,
  parseLeaderboardQuery,
  rankLeaderboardRows,
  resolveLeaderboardUnitType,
  type LeaderboardMetric,
  type LeaderboardPartition,
  type LeaderboardRow,
} from "./leaderboard-model";
import { deriveRatio } from "./ratios";

const ratio = (numerator: number, denominator: number): LeaderboardMetric => ({
  kind: "ratio",
  ratio: deriveRatio(numerator, denominator, "K"),
});

function playerRow(gamePlayerId: string, displayName: string, metrics: LeaderboardRow["metrics"]): LeaderboardRow {
  return { subject: { kind: "player", gamePlayerId, displayName }, metrics };
}

test("query parsing falls back to safe defaults for every unknown value", () => {
  assert.deepEqual(parseLeaderboardQuery({}), {
    window: "14d",
    board: "players",
    unitType: null,
    sort: "kills",
    dir: "desc",
  });
  assert.deepEqual(parseLeaderboardQuery({ board: "secret", type: "navy", sort: "drop table", dir: "sideways" }, "30d"), {
    window: "30d",
    board: "players",
    unitType: null,
    sort: "kills",
    dir: "desc",
  });
});

test("query parsing accepts each board's own columns and branch slugs", () => {
  assert.deepEqual(parseLeaderboardQuery({ board: "units", type: "cavalry", sort: "stars", dir: "asc" }), {
    window: "14d",
    board: "units",
    unitType: "CAVALRY",
    sort: "stars",
    dir: "asc",
  });
  assert.equal(parseLeaderboardQuery({ board: "units", sort: "kad" }).sort, "kd", "a Player-only column falls back to the Units default");
  assert.equal(parseLeaderboardQuery({ board: ["commanders", "units"] }).board, "commanders", "repeated params use the first value");
  assert.equal(parseLeaderboardQuery({ board: "generals", type: "rifles" }).unitType, null, "Generals are not branch-partitioned");
});

test("branch resolution honors an explicit request and otherwise picks the first branch with results", () => {
  const partitions: LeaderboardPartition[] = [
    { unitType: "REGULAR", rows: [] },
    { unitType: "RIFLES", rows: [playerRow("p", "P", {})] },
    { unitType: "CAVALRY", rows: [playerRow("q", "Q", {})] },
    { unitType: "ARTILLERY", rows: [] },
  ];
  assert.equal(resolveLeaderboardUnitType(null, partitions), "RIFLES");
  assert.equal(resolveLeaderboardUnitType("ARTILLERY", partitions), "ARTILLERY", "an explicitly chosen empty branch stays selected");
  assert.equal(resolveLeaderboardUnitType(null, []), "REGULAR");
});

test("leaderboard links keep URLs minimal and reset sorting when the board changes", () => {
  const base = parseLeaderboardQuery({});
  assert.equal(leaderboardHref(base), "/leaderboard");
  assert.equal(leaderboardHref(base, { window: "all-time" }), "/leaderboard?window=all-time");
  assert.equal(leaderboardHref({ ...base, unitType: "RIFLES" }, { sort: "kd", dir: "asc" }), "/leaderboard?type=rifles&sort=kd&dir=asc");
  assert.equal(
    leaderboardHref({ ...base, sort: "assists", dir: "asc", unitType: "CAVALRY" }, { board: "units" }),
    "/leaderboard?board=units&type=cavalry",
    "switching boards drops the old board's sort but keeps the branch",
  );
  assert.equal(leaderboardHref({ ...base, unitType: "RIFLES" }, { board: "generals" }), "/leaderboard?board=generals");
});

test("ratio ordering keeps zero-death states explicit: N K above finite ratios, 0 ÷ 0 lowest", () => {
  assert.ok(compareLeaderboardMetrics(ratio(18, 0), ratio(31, 15)) > 0);
  assert.ok(compareLeaderboardMetrics(ratio(31, 15), ratio(1, 2)) > 0);
  assert.ok(compareLeaderboardMetrics(ratio(18, 0), ratio(3, 0)) > 0, "zero-death states order by numerator");
  assert.ok(compareLeaderboardMetrics(ratio(0, 0), ratio(0, 5)) < 0, "0 ÷ 0 sorts below a finite 0");
  assert.equal(compareLeaderboardMetrics(ratio(2, 1), ratio(4, 2)), 0, "equal pooled values tie");
});

test("ranking uses competition ranks with a stable name tie-break in both directions", () => {
  const rows = [
    playerRow("p-c", "Charlie", { kills: { kind: "count", value: 10 } }),
    playerRow("p-a", "Alpha", { kills: { kind: "count", value: 12 } }),
    playerRow("p-b", "Bravo", { kills: { kind: "count", value: 10 } }),
    playerRow("p-d", "Delta", { kills: { kind: "count", value: 3 } }),
  ];
  const desc = rankLeaderboardRows(rows, "kills", "desc");
  assert.deepEqual(desc.map((row) => [row.rank, row.subject.kind === "player" ? row.subject.displayName : ""]), [
    [1, "Alpha"],
    [2, "Bravo"],
    [2, "Charlie"],
    [4, "Delta"],
  ]);
  const asc = rankLeaderboardRows(rows, "kills", "asc");
  assert.deepEqual(asc.map((row) => row.rank), [1, 2, 2, 4]);
  assert.equal(asc[0].subject.kind === "player" && asc[0].subject.displayName, "Delta");
  assert.equal(rows[0].subject.kind === "player" && rows[0].subject.displayName, "Charlie", "input order is not mutated");
});

test("ranking by a ratio places a zero-death player first without averaging anything", () => {
  const rows = [
    playerRow("veteran", "Veteran", { kd: ratio(31, 15) }),
    playerRow("flawless", "Flawless", { kd: ratio(18, 0) }),
    playerRow("idle", "Idle", { kd: ratio(0, 0) }),
  ];
  assert.deepEqual(rankLeaderboardRows(rows, "kd", "desc").map((row) => row.subject.kind === "player" && row.subject.gamePlayerId), [
    "flawless",
    "veteran",
    "idle",
  ]);
});

test("rows missing the sort metric rank last", () => {
  const rows = [playerRow("none", "None", {}), playerRow("some", "Some", { kills: { kind: "count", value: 0 } })];
  const last = rankLeaderboardRows(rows, "kills", "desc")[1];
  assert.equal(last.subject.kind === "player" && last.subject.gamePlayerId, "none");
});

test("display formatting rounds finite values and preserves the approved zero-denominator form", () => {
  assert.equal(formatRatio(deriveRatio(31, 15, "K")), "2.07");
  assert.equal(formatRatio(deriveRatio(20, 5, "K")), "4");
  assert.equal(formatRatio(deriveRatio(5, 2, "K")), "2.5");
  assert.equal(formatRatio(deriveRatio(18, 0, "K")), "18 K");
  assert.equal(formatRatio(deriveRatio(24, 0, "K+A")), "24 K+A");
  assert.equal(describeRatio(deriveRatio(31, 15, "K")), "31 ÷ 15");
  assert.equal(formatLeaderboardMetric({ kind: "average", value: 4 / 3 }), "1.33");
  assert.equal(formatLeaderboardMetric({ kind: "count", value: 42 }), "42");
});
