import assert from "node:assert/strict";
import test from "node:test";

import { getEventBattleStatistics } from "./event-battle";
import type { EventBattleSideSummary } from "./event-battle";

function flattenUnits(value: Awaited<ReturnType<typeof getEventBattleStatistics>>) {
  if (value === null) return [];
  const units = [...value.ungroupedAtomicUnits];
  const visit = (group: typeof value.groups[number]) => {
    units.push(...group.atomicUnits);
    group.children.forEach(visit);
  };
  value.groups.forEach(visit);
  return units;
}

test("Event Battle reader is event-scoped and excludes unknown Events", async () => {
  const result = await getEventBattleStatistics("demo-event-main-review");
  const unknown = await getEventBattleStatistics("demo-event-does-not-exist");

  assert.equal(result?.eventId, "demo-event-main-review");
  assert.ok(result);
  assert.equal(unknown, null);
  assert.ok(flattenUnits(result).length > 0);
  assert.equal(new Set(flattenUnits(result).map((unit) => unit.id)).size, flattenUnits(result).length);
});

test("Event Battle reader exposes finalized facts and safe pending state", async () => {
  const result = await getEventBattleStatistics("demo-event-main-review");
  assert.ok(result);
  const units = flattenUnits(result);
  const finalized = units.find((unit) => unit.resultState === "FINALIZED");
  const pending = units.find((unit) => unit.resultState === "PENDING");
  const zeroDeath = units.find((unit) => unit.summary?.kdr.state === "ZERO_DENOMINATOR");

  assert.ok(finalized?.summary);
  assert.ok(finalized.players.length > 0);
  assert.ok(finalized.commander);
  assert.ok(finalized.players.some((player) => player.role === "COMMANDER"));
  assert.ok(finalized.players.some((player) => player.role === null));
  assert.equal(pending?.summary, null);
  assert.deepEqual(pending?.players, []);
  assert.equal(pending?.commander, null);
  assert.equal(zeroDeath?.summary?.kdr.display.endsWith(" K"), true);
  assert.equal(JSON.stringify(result).includes("rank"), false);
});

test("Event Battle averages use finalized Player appearances and sides use pooled totals", async () => {
  const result = await getEventBattleStatistics("demo-event-main-review");
  assert.ok(result);
  const units = flattenUnits(result);

  for (const unit of units.filter((entry) => entry.resultState === "FINALIZED")) {
    assert.ok(unit.summary);
    assert.equal(unit.summary.playerCount, unit.players.length);
    if (unit.players.length === 0) {
      assert.equal(unit.summary.averagesPerPlayer, null);
      continue;
    }

    const total = unit.players.reduce(
      (value, player) => ({
        kills: value.kills + player.kills,
        deaths: value.deaths + player.deaths,
        assists: value.assists + player.assists,
      }),
      { kills: 0, deaths: 0, assists: 0 },
    );
    assert.deepEqual(unit.summary.averagesPerPlayer, {
      kills: total.kills / unit.players.length,
      deaths: total.deaths / unit.players.length,
      assists: total.assists / unit.players.length,
    });
  }

  for (const side of ["ATTACKER", "DEFENDER"] as const) {
    const finalized = units.filter(
      (unit) => unit.side === side && unit.resultState === "FINALIZED" && unit.summary !== null,
    );
    const sideResult: EventBattleSideSummary | null = result.sideSummaries[side];
    if (finalized.length === 0) {
      assert.equal(sideResult, null);
      continue;
    }

    const expected = finalized.reduce(
      (totals, unit) => {
        const stats = unit.summary;
        if (stats === null) return totals;
        return {
          kills: totals.kills + stats.kills,
          deaths: totals.deaths + stats.deaths,
          tickets: totals.tickets + (stats.tickets ?? 0),
          flagCaptures: totals.flagCaptures + (stats.flagCaptures ?? 0),
        };
      },
      { kills: 0, deaths: 0, tickets: 0, flagCaptures: 0 },
    );
    assert.equal(sideResult?.kdr.numerator, expected.kills);
    assert.equal(sideResult?.kdr.denominator, expected.deaths);
    assert.equal(sideResult?.tickets, expected.tickets);
    assert.equal(sideResult?.flagCaptures, expected.flagCaptures);
  }
});
