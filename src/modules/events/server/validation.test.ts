import assert from "node:assert/strict";
import test from "node:test";

import { deriveEventSchedule } from "../presentation";
import {
  MAX_EVENT_DURATION_MINUTES,
  MAX_EVENT_SIDE_NAME_LENGTH,
  MAX_RALLY_MINUTES_BEFORE_START,
  normalizeEventSideName,
  validateEventInvitePolicy,
  validateEventSchedule,
} from "./validation";

test("validates bounded whole-minute rally and duration values", () => {
  const start = new Date("2026-11-08T00:15:00.000Z");
  validateEventSchedule(start, 0, 1);
  validateEventSchedule(
    start,
    MAX_RALLY_MINUTES_BEFORE_START,
    MAX_EVENT_DURATION_MINUTES,
  );

  for (const [rally, duration] of [
    [-1, 35],
    [MAX_RALLY_MINUTES_BEFORE_START + 1, 35],
    [1.5, 35],
    [0, 0],
    [0, -30],
    [0, MAX_EVENT_DURATION_MINUTES + 1],
    [0, 35.5],
    ["30", 35],
    [0, "35"],
  ]) {
    assert.throws(() => validateEventSchedule(start, rally, duration));
  }
  assert.throws(
    () => validateEventSchedule(new Date(Number.NaN), 0, 35),
    /valid scheduled date and time/i,
  );
  assert.throws(
    () => validateEventSchedule(new Date(8.64e15), 0, 1),
    /outside the supported date range/i,
  );
});

test("derives rally and expected end across UTC date rollover", () => {
  const start = new Date("2026-11-08T00:15:00.000Z");
  const { rallyAt, expectedEndAt } = deriveEventSchedule(start, 30, 35);

  assert.equal(rallyAt.toISOString(), "2026-11-07T23:45:00.000Z");
  assert.equal(expectedEndAt?.toISOString(), "2026-11-08T00:50:00.000Z");
});

test("keeps duration unknown for legacy Events while deriving rally", () => {
  const { rallyAt, expectedEndAt } = deriveEventSchedule(
    new Date("2026-11-08T00:15:00.000Z"),
    0,
    null,
  );

  assert.equal(rallyAt.toISOString(), "2026-11-08T00:15:00.000Z");
  assert.equal(expectedEndAt, null);
});

test("validates invite policy and normalizes optional side labels", () => {
  assert.equal(validateEventInvitePolicy("OPEN"), "OPEN");
  assert.equal(validateEventInvitePolicy("CLOSED"), "CLOSED");
  assert.throws(() => validateEventInvitePolicy("INVALID"), /Invite policy/i);

  assert.equal(normalizeEventSideName(undefined), null);
  assert.equal(normalizeEventSideName("   "), null);
  assert.equal(normalizeEventSideName(" Coalition Forces "), "Coalition Forces");
  assert.throws(
    () => normalizeEventSideName("x".repeat(MAX_EVENT_SIDE_NAME_LENGTH + 1)),
    /characters or fewer/i,
  );
});
