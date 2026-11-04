import "server-only";

import { getCurrentRosterCounts } from "@/modules/players/server/queries";
import {
  getUnitDescendantCounts,
  type UnitDirectoryRow,
} from "../public-presentation";

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

export async function listPublicUnitDirectory(): Promise<UnitDirectoryRow[]> {
  if (isUnitsDemoMode()) {
    const units = listDemoUnits();
    const descendantCounts = getUnitDescendantCounts(units);
    return units.map((unit) => ({
      ...unit,
      commander: null,
      memberCount: null,
      descendantCount: descendantCounts.get(unit.id) ?? 0,
    }));
  }

  const { prisma } = await import("@/lib/prisma");
  const units = await prisma.unit.findMany({
    select: {
      ...identity,
      parent: { select: identity },
      commander: { select: { name: true, image: true } },
    },
    orderBy: [...orderBy],
  });
  const rosterCounts = await getCurrentRosterCounts(units.map(({ id }) => id));
  const membersByUnitId = new Map(rosterCounts.map(({ unitId, memberCount }) => [unitId, memberCount]));
  const descendantCounts = getUnitDescendantCounts(units);

  return units.map((unit) => ({
    ...unit,
    memberCount: membersByUnitId.get(unit.id) ?? 0,
    descendantCount: descendantCounts.get(unit.id) ?? 0,
  }));
}

type PublicUnitHierarchyRecord = {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
  discordInvite: string | null;
  groupLink: string | null;
  parentId: string | null;
  commanderUserId: string;
  commanderName: string | null;
  commanderImage: string | null;
};

export async function getPublicUnitHierarchy(unitId: string) {
  if (isUnitsDemoMode()) {
    const units = listDemoUnits();
    const selected = units.find((unit) => unit.id === unitId);
    if (!selected) return null;

    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    const childrenById = new Map<string, string[]>();
    for (const unit of units) {
      if (!unit.parent) continue;
      const children = childrenById.get(unit.parent.id) ?? [];
      children.push(unit.id);
      childrenById.set(unit.parent.id, children);
    }

    const included = new Set([unitId]);
    let parent = selected.parent;
    while (parent && !included.has(parent.id)) {
      const parentId = parent.id;
      included.add(parent.id);
      parent = unitsById.get(parentId)?.parent ?? null;
    }

    const pending = [unitId];
    while (pending.length > 0) {
      const parentId = pending.pop()!;
      for (const childId of childrenById.get(parentId) ?? []) {
        if (included.has(childId)) continue;
        included.add(childId);
        pending.push(childId);
      }
    }

    const hierarchy = units.filter((unit) => included.has(unit.id));
    const descendantCounts = getUnitDescendantCounts(hierarchy);
    const hierarchyById = new Map(hierarchy.map((unit) => [unit.id, unit]));
    return hierarchy.map((unit) => ({
      ...unit,
      commander: null,
      memberCount: null,
      descendantCount: descendantCounts.get(unit.id) ?? 0,
      parent: unit.parent
        ? { id: unit.parent.id, name: hierarchyById.get(unit.parent.id)?.name ?? unit.parent.name }
        : null,
    }));
  }

  const { prisma } = await import("@/lib/prisma");
  const hierarchy = await prisma.$queryRaw<PublicUnitHierarchyRecord[]>`
    WITH RECURSIVE ancestors AS (
      SELECT unit."id", unit."name", unit."description", unit."imageRef",
        unit."discordInvite", unit."groupLink", unit."parentId", unit."commanderUserId"
      FROM "Unit" AS unit
      WHERE unit."id" = ${unitId}
      UNION
      SELECT parent."id", parent."name", parent."description", parent."imageRef",
        parent."discordInvite", parent."groupLink", parent."parentId", parent."commanderUserId"
      FROM "Unit" AS parent
      INNER JOIN ancestors AS child ON parent."id" = child."parentId"
    ),
    descendants AS (
      SELECT unit."id", unit."name", unit."description", unit."imageRef",
        unit."discordInvite", unit."groupLink", unit."parentId", unit."commanderUserId"
      FROM "Unit" AS unit
      WHERE unit."id" = ${unitId}
      UNION
      SELECT child."id", child."name", child."description", child."imageRef",
        child."discordInvite", child."groupLink", child."parentId", child."commanderUserId"
      FROM "Unit" AS child
      INNER JOIN descendants AS parent ON child."parentId" = parent."id"
    ),
    relevant AS (
      SELECT * FROM ancestors
      UNION
      SELECT * FROM descendants
    )
    SELECT relevant."id", relevant."name", relevant."description",
      relevant."imageRef", relevant."discordInvite", relevant."groupLink",
      relevant."parentId", relevant."commanderUserId",
      commander."name" AS "commanderName", commander."image" AS "commanderImage"
    FROM relevant
    INNER JOIN "User" AS commander ON commander."id" = relevant."commanderUserId"
    ORDER BY relevant."name" ASC, relevant."id" ASC
  `;
  if (hierarchy.length === 0) return null;

  const rosterCounts = await getCurrentRosterCounts(hierarchy.map(({ id }) => id));
  const memberCountById = new Map(
    rosterCounts.map(({ unitId: id, memberCount }) => [id, memberCount]),
  );
  const unitsById = new Map(hierarchy.map((unit) => [unit.id, unit]));
  const descendantCounts = getUnitDescendantCounts(
    hierarchy.map(({ id, parentId }) => ({
      id,
      parent: parentId ? { id: parentId } : null,
    })),
  );

  return hierarchy.map((unit) => ({
    id: unit.id,
    name: unit.name,
    description: unit.description,
    imageRef: unit.imageRef,
    discordInvite: unit.discordInvite,
    groupLink: unit.groupLink,
    parent: unit.parentId
      ? { id: unit.parentId, name: unitsById.get(unit.parentId)?.name ?? "Unknown Unit" }
      : null,
    commander: { name: unit.commanderName, image: unit.commanderImage },
    memberCount: memberCountById.get(unit.id) ?? 0,
    descendantCount: descendantCounts.get(unit.id) ?? 0,
  }));
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
  const [unit, rosterCounts] = await Promise.all([
    prisma.unit.findUnique({
      where: { id },
      select: {
        ...identity,
        parentId: true,
        rootUnitId: true,
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true }, orderBy: [...orderBy] },
        commander: { select: { name: true, image: true } },
        rootUnit: { select: { unitId: true } },
      },
    }),
    getCurrentRosterCounts([id], prisma),
  ]);
  if (unit === null) return null;

  return {
    ...unit,
    memberCount: rosterCounts[0]?.memberCount ?? 0,
  };
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
