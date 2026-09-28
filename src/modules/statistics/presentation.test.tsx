import assert from "node:assert/strict";
import test from "node:test";

import {
  StatisticsRatio,
  UnitTypeLabel,
  parseStatisticsWindow,
  resolveStatisticsWindow,
} from "./presentation";

const ratioWithValue = {
  numerator: 20,
  denominator: 5,
  state: "RATIO",
  value: 4,
  display: "4",
} as const;

test("ratio rendering preserves raw semantics and zero-death labels", () => {
  const renderRatioText = (ratio: Parameters<typeof StatisticsRatio>[0]["ratio"]) =>
    (StatisticsRatio({ ratio }) as { props: { children: string } }).props.children;

  assert.equal(renderRatioText(ratioWithValue), "4");
  assert.equal(renderRatioText({ numerator: 10, denominator: 0, state: "ZERO_DENOMINATOR", value: null, display: "10 K" }), "10 K");
  assert.equal(renderRatioText({ numerator: 14, denominator: 0, state: "ZERO_DENOMINATOR", value: null, display: "14 K+A" }), "14 K+A");
});

test("unit-type labels remain explicit and distinct", () => {
  assert.equal(UnitTypeLabel.REGULAR, "Regular");
  assert.equal(UnitTypeLabel.RIFLES, "Rifles");
  assert.equal(UnitTypeLabel.CAVALRY, "Cavalry");
  assert.equal(UnitTypeLabel.ARTILLERY, "Artillery");
});

test("window parsing respects the approved defaults and values", () => {
  assert.equal(parseStatisticsWindow("14d"), "14d");
  assert.equal(parseStatisticsWindow("30d"), "30d");
  assert.equal(parseStatisticsWindow("all-time"), "all-time");
  assert.equal(parseStatisticsWindow(undefined), "14d");
  assert.equal(resolveStatisticsWindow({ get: () => "30d" }), "30d");
});
