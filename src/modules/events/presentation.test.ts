import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_TYPE_NAMES,
  eventTypeStyle,
  formatEventScheduleSummary,
  isBattleEventType,
  matchesEventTypeFilter,
} from "./presentation";

test("Event type options preserve existing values and add Ceremony and Other", () => {
  assert.deepEqual(EVENT_TYPE_NAMES, [
    "Internal",
    "External",
    "Mixed",
    "Grand Battle",
    "Ceremony",
    "Other",
  ]);
  assert.equal(eventTypeStyle("Ceremony").key, "ceremony");
  assert.equal(eventTypeStyle("Other").key, "other");
  assert.equal(matchesEventTypeFilter("Other", "other"), true);
  assert.equal(matchesEventTypeFilter("Custom Gathering", "other"), true);
});

test("Ceremony and Other do not surface battle-only sections", () => {
  assert.equal(isBattleEventType("Ceremony"), false);
  assert.equal(isBattleEventType("Other"), false);
  assert.equal(isBattleEventType("Internal"), true);
  assert.equal(isBattleEventType("Custom Battle"), true);
});

test("Ceremony uses silver and Other uses dark gray across Event accents", () => {
  const ceremony = eventTypeStyle("Ceremony");
  assert.equal(ceremony.dotClass, "bg-[#c0c0c0]");
  assert.equal(ceremony.barClass, "border-l-[#c0c0c0]");
  assert.equal(ceremony.badgeClass, "bg-[#c0c0c0] border-[#e0e0e0] text-[#202226]");

  const other = eventTypeStyle("Other");
  assert.equal(other.dotClass, "bg-[#4b4f56]");
  assert.equal(other.barClass, "border-l-[#4b4f56]");
  assert.equal(other.badgeClass, "bg-[#292c31] border-[#4b4f56] text-[#b8bcc3]");
  assert.equal(eventTypeStyle("Mixed").dotClass, "bg-type-blue");
  assert.equal(eventTypeStyle("Custom Gathering").dotClass, "bg-faint");
});

test("schedule summary clearly presents rally and planned duration", () => {
  assert.equal(formatEventScheduleSummary(30, 35), "Rally 30m before · 35 min");
  assert.equal(formatEventScheduleSummary(0, 60), "Rally at start · 60 min");
  assert.equal(formatEventScheduleSummary(0, null), "Rally at start · duration not set");
});
