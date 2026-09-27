import "server-only";

import {
  canManageAuthorizedUsers,
  canMoveUnit,
} from "./authorization";
import { getDemoUnit, isUnitsDemoMode, listDemoUnits } from "./demo";

const identity = {
  id: true,
  name: true,
  description: true,
  imageRef: true,
  discordInvite: true,
  groupLink: true,
} as const;
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

export async function getUnitManagementData(id: string) {
  if (isUnitsDemoMode()) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma.unit.findUnique({
    where: { id },
    select: {
      ...identity,
      parentId: true,
      rootUnitId: true,
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true }, orderBy: [...orderBy] },
      rootUnit: { select: { unitId: true } },
    },
  });
}

export async function listAuthorizedMembershipsForManagement(
  userId: string,
  unitId: string,
) {
  if (!(await canManageAuthorizedUsers(userId, unitId))) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma.authorizedUserMembership.findMany({
    where: { unitId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grants: {
        orderBy: [{ permission: "asc" }, { scope: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ endedAt: "asc" }, { authorityLevel: "asc" }, { createdAt: "asc" }],
  });
}

export async function listMoveDestinations(userId: string, unitId: string) {
  if (isUnitsDemoMode()) return [];
  const { prisma } = await import("@/lib/prisma");
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, parentId: true, rootUnitId: true },
  });
  if (!unit?.rootUnitId || unit.parentId === null) return [];

  const units = await prisma.unit.findMany({
    where: { rootUnitId: unit.rootUnitId },
    select: { id: true, name: true, parentId: true },
  });
  const descendants = new Set<string>();
  const children = new Map<string, string[]>();
  for (const candidate of units) {
    if (candidate.parentId === null) continue;
    const siblings = children.get(candidate.parentId) ?? [];
    siblings.push(candidate.id);
    children.set(candidate.parentId, siblings);
  }
  const stack = [...(children.get(unitId) ?? [])];
  while (stack.length > 0) {
    const descendantId = stack.pop()!;
    if (descendants.has(descendantId)) continue;
    descendants.add(descendantId);
    stack.push(...(children.get(descendantId) ?? []));
  }

  const potential = units.filter(
    (candidate) => candidate.id !== unit.parentId && candidate.id !== unitId && !descendants.has(candidate.id),
  );
  const authorized = await Promise.all(
    potential.map(async (candidate) => ({
      candidate,
      allowed: await canMoveUnit(userId, unitId, candidate.id),
    })),
  );
  return authorized
    .filter(({ allowed }) => allowed)
    .map(({ candidate }) => ({ id: candidate.id, name: candidate.name }));
}
