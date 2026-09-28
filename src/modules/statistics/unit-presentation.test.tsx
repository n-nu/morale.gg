import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UnitStatisticsSections } from "./unit-presentation";

const direct = {
  window: "14d" as const,
  unitId: "unit-1",
  unitTypes: [{
    unitType: "REGULAR" as const,
    auditCount: 1,
    totals: { kills: 2, deaths: 1, assists: 3, tickets: 4, flagCaptures: 5, flagLosses: 6, stars: 7 },
    averagePerAudit: { kills: 2, deaths: 1, assists: 3, tickets: 4, flagCaptures: 5, flagLosses: 6, stars: 7 },
    killDeathRatio: { numerator: 2, denominator: 1, state: "RATIO" as const, value: 2, display: "2" },
  }],
};

const organizational = {
  ...direct,
  unitTypes: [{ ...direct.unitTypes[0], totals: { ...direct.unitTypes[0].totals, kills: 20 } }],
};

const average = {
  window: "14d" as const,
  unitId: "unit-1",
  qualifyingUnitCount: 1,
  unitTypes: [{
    unitType: "REGULAR" as const,
    qualifyingUnits: 1,
    averagePerQualifyingUnit: { kills: 20, deaths: 10, assists: 5, tickets: 4, flagCaptures: 2, flagLosses: 1, stars: 3 },
  }],
};

test("Unit perspectives are labeled and organizational output is distinct from direct output", () => {
  const html = renderToStaticMarkup(<UnitStatisticsSections direct={direct} organizational={organizational} average={average} />);
  assert.match(html, /Direct Performance/);
  assert.match(html, /Organizational Performance/);
  assert.match(html, /Average Unit Performance/);
  assert.match(html, />2<\/dd>/);
  assert.match(html, />20<\/dd>/);
});

test("Average Unit Performance omits KDR and preserves all Unit type labels", () => {
  const html = renderToStaticMarkup(<UnitStatisticsSections direct={{ ...direct, unitTypes: [] }} organizational={organizational} average={average} />);
  assert.equal(html.match(/>KDR</g)?.length ?? 0, 1);
  assert.match(html, /Rifles: no observations/);
  assert.match(html, /Cavalry: no observations/);
  assert.match(html, /Artillery: no observations/);
});

test("Direct empty state remains visible while Organizational results render", () => {
  const html = renderToStaticMarkup(<UnitStatisticsSections direct={{ ...direct, unitTypes: [] }} organizational={organizational} average={{ ...average, unitTypes: [] }} />);
  assert.match(html, /No direct observations/);
  assert.match(html, /Organizational Performance/);
  assert.match(html, /20/);
});