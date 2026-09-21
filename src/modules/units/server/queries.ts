import "server-only";

import { getDemoUnit, isUnitsDemoMode, listDemoUnits } from "./demo";

const identity = { id: true, name: true } as const;
const orderBy = [{ name: "asc" }, { id: "asc" }] as const;

export async function listUnits() {
  if (isUnitsDemoMode()) return listDemoUnits();
  const { prisma } = await import("@/lib/prisma");
  return prisma.unit.findMany({
    select: { ...identity, parent: { select: identity } },
    orderBy: [...orderBy],
  });
}

export async function getUnit(id: string) {
  if (isUnitsDemoMode()) return getDemoUnit(id);
  const { prisma } = await import("@/lib/prisma");
  return prisma.unit.findUnique({
    where: { id },
    select: {
      ...identity,
      parent: { select: identity },
      children: { select: identity, orderBy: [...orderBy] },
    },
  });
}
