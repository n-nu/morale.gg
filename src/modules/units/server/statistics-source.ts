import "server-only";

import { prisma } from "@/lib/prisma";

export type HierarchyUnitReference = {
  id: string;
  name: string;
  parentId: string | null;
};

export async function getDirectUnit(unitId: string, db = prisma): Promise<HierarchyUnitReference | null> {
  return db.unit.findUnique({
    where: { id: unitId },
    select: { id: true, name: true, parentId: true },
  });
}

export async function getSubtreeUnitIds(unitId: string, db = prisma): Promise<string[]> {
  const anchor = await db.unit.findUnique({
    where: { id: unitId },
    select: { id: true, parentId: true, rootUnitId: true },
  });
  if (anchor === null) return [];

  const candidateIds = new Set<string>([unitId]);
  const stack = [unitId];
  const units = await db.unit.findMany({
    where: anchor.rootUnitId ? { rootUnitId: anchor.rootUnitId } : { id: unitId },
    select: { id: true, parentId: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  const children = new Map<string, string[]>();
  for (const unit of units) {
    if (unit.parentId === null) continue;
    const siblings = children.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    children.set(unit.parentId, siblings);
  }

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    for (const childId of children.get(currentId) ?? []) {
      if (!candidateIds.has(childId)) {
        candidateIds.add(childId);
        stack.push(childId);
      }
    }
  }

  return [...candidateIds].sort((left, right) => left.localeCompare(right));
}
