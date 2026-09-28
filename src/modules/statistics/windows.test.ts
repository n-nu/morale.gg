import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
} from "./windows";

const now = new Date("2026-09-27T12:00:00.000Z");

test("the default window is trailing 14 days with an inclusive lower boundary", () => {
  assert.equal(DEFAULT_STATISTICS_WINDOW, "14d");
  const range = getStatisticsWindowRange(undefined, now);
  assert.equal(range.start?.toISOString(), "2026-09-13T12:00:00.000Z");
  assert.equal(isEventTimeInStatisticsWindow(range.start!, range), true);
  assert.equal(isEventTimeInStatisticsWindow(new Date(range.start!.getTime() - 1), range), false);
  assert.equal(isEventTimeInStatisticsWindow(now, range), true);
  assert.equal(isEventTimeInStatisticsWindow(new Date(now.getTime() + 1), range), false);
});

test("the 30-day window uses the same inclusive Event-time boundaries", () => {
  const range = getStatisticsWindowRange("30d", now);
  assert.equal(range.start?.toISOString(), "2026-08-28T12:00:00.000Z");
  assert.equal(isEventTimeInStatisticsWindow(range.start!, range), true);
  assert.equal(isEventTimeInStatisticsWindow(new Date(range.start!.getTime() - 1), range), false);
});

test("all time has no Event-time bounds", () => {
  const range = getStatisticsWindowRange("all-time", now);
  assert.equal(range.start, null);
  assert.equal(range.end, null);
  assert.equal(isEventTimeInStatisticsWindow(new Date("2000-01-01T00:00:00.000Z"), range), true);
  assert.equal(isEventTimeInStatisticsWindow(new Date("2030-01-01T00:00:00.000Z"), range), true);
});
