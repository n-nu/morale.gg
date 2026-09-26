import assert from "node:assert/strict";
import test from "node:test";

import { filterUpcomingCalendarEvents } from "./calendar-grid";

test("calendar upcoming filter includes the cutoff and future Events only", () => {
  const now = Date.parse("2026-09-26T12:00:00.000Z");
  const events = [
    { id: "past", name: "Past", iso: new Date(now - 1).toISOString(), eventType: "Internal", opponent: null, map: null },
    { id: "now", name: "Now", iso: new Date(now).toISOString(), eventType: "Internal", opponent: null, map: null },
    { id: "future", name: "Future", iso: new Date(now + 1).toISOString(), eventType: "Internal", opponent: null, map: null },
  ];

  assert.deepEqual(
    filterUpcomingCalendarEvents(events, now).map((event) => event.id),
    ["now", "future"],
  );
});