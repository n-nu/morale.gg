import assert from "node:assert/strict";
import test from "node:test";

import { deriveRatio } from "./ratios";

test("ratios use raw populations and preserve zero-denominator presentation", () => {
  assert.deepEqual(deriveRatio(20, 5, "K"), {
    numerator: 20,
    denominator: 5,
    state: "RATIO",
    value: 4,
    display: "4",
  });
  assert.deepEqual(deriveRatio(10, 0, "K"), {
    numerator: 10,
    denominator: 0,
    state: "ZERO_DENOMINATOR",
    value: null,
    display: "10 K",
  });
  assert.deepEqual(deriveRatio(14, 0, "K+A"), {
    numerator: 14,
    denominator: 0,
    state: "ZERO_DENOMINATOR",
    value: null,
    display: "14 K+A",
  });
});
