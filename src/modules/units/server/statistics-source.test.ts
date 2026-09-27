import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import { getDirectUnit, getSubtreeUnitIds } from "./statistics-source";

test("direct unit lookup and subtree traversal do not mutate hierarchy", async () => {
  const db = {
    unit: {
      findUnique: async (args: Record<string, unknown>) => {
        const where = args.where as { id: string };
        const select = args.select as { id?: boolean; name?: boolean; parentId?: boolean; rootUnitId?: boolean } | undefined;
        const base = { id: where.id, name: "Parent", parentId: null, rootUnitId: "parent" };
        if (select === undefined) return base;
        const result: Record<string, unknown> = {};
        if (select.id) result.id = base.id;
        if (select.name) result.name = base.name;
        if (select.parentId) result.parentId = base.parentId;
        if (select.rootUnitId) result.rootUnitId = base.rootUnitId;
        return result;
      },
      findMany: async () => [
        { id: "parent", parentId: null, rootUnitId: "parent" },
        { id: "child-a", parentId: "parent", rootUnitId: "parent" },
        { id: "child-b", parentId: "child-a", rootUnitId: "parent" },
      ],
    },
  } as unknown as typeof prisma;

  assert.deepEqual(await getDirectUnit("parent", db), { id: "parent", name: "Parent", parentId: null });
  assert.deepEqual(await getSubtreeUnitIds("parent", db), ["child-a", "child-b", "parent"]);
});
