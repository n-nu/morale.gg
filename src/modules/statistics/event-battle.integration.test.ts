import assert from "node:assert/strict";
import test from "node:test";

import { getEventBattleStatistics } from "./event-battle";

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
