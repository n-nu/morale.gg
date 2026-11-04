import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getPublicUnitPresentationBatch } from "./public-presentation";

const originalFindMany = prisma.unit.findMany;
const originalDemoMode = process.env.UNITS_DEMO_MODE;

test.afterEach(() => {
  Object.defineProperty(prisma.unit, "findMany", { configurable: true, value: originalFindMany });
  if (originalDemoMode === undefined) delete process.env.UNITS_DEMO_MODE;
  else process.env.UNITS_DEMO_MODE = originalDemoMode;
});

test("public Unit presentation batches deduplicated IDs and preserves request order", async () => {
  process.env.UNITS_DEMO_MODE = "false";
  let selection: unknown;
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: async (args: unknown) => {
      selection = args;
      return [
        { id: "unit-b", name: "Second", imageRef: "second.png" },
        { id: "unit-a", name: "First", imageRef: null },
      ];
    },
  });

  const result = await getPublicUnitPresentationBatch([" unit-b ", "unit-a", "unit-b", "", "missing"]);

  assert.deepEqual(selection, {
    where: { id: { in: ["unit-b", "unit-a", "missing"] } },
    select: { id: true, name: true, imageRef: true },
  });
  assert.deepEqual(result, [
    { unitId: "unit-b", name: "Second", imageRef: "second.png" },
    { unitId: "unit-a", name: "First", imageRef: null },
  ]);
});

test("public Unit presentation uses the demo catalog without querying persistence", async () => {
  process.env.UNITS_DEMO_MODE = "true";
  let queried = false;
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: async () => {
      queried = true;
      return [];
    },
  });

  assert.deepEqual(await getPublicUnitPresentationBatch(["demo-company", "missing"]), [
    { unitId: "demo-company", name: "Light Company", imageRef: null },
  ]);
  assert.equal(queried, false);
});
