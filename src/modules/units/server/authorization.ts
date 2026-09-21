import "server-only";

import type { Permission, PermissionScope } from "@prisma/client";

type UnitRecord = {
  id: string;
  parentId: string | null;
  rootUnitId: string | null;
};

type GrantRecord = {
  id: string;
  authorizedUserMembershipId: string;
  permission: Permission;
  scope: PermissionScope | null;
  delegatedFromGrantId: string | null;
  revokedAt: Date | null;
  membership: {
    userId: string;
    unitId: string;
    authorityLevel: number;
  } | null;
};

type AuthoritySnapshot = {
  units: Map<string, UnitRecord>;
  roots: Set<string>;
  grants: Map<string, GrantRecord>;
};

type Ancestry = {
  unitIds: string[];
  rootUnitId: string;
};

async function loadAuthoritySnapshot(): Promise<AuthoritySnapshot> {
  const { prisma } = await import("@/lib/prisma");
  const [units, roots, grants] = await Promise.all([
    prisma.unit.findMany({
      select: { id: true, parentId: true, rootUnitId: true },
    }),
    prisma.rootUnit.findMany({
      select: { unitId: true, designatedUnit: { select: { id: true } } },
    }),
    prisma.permissionGrant.findMany({
      select: {
        id: true,
        authorizedUserMembershipId: true,
        permission: true,
        scope: true,
        delegatedFromGrantId: true,
        revokedAt: true,
        membership: {
          select: { userId: true, unitId: true, authorityLevel: true },
        },
      },
    }),
  ]);

  return {
    units: new Map(units.map((unit) => [unit.id, unit])),
    roots: new Set(
      roots
        .filter((root) => root.unitId === root.designatedUnit.id)
        .map((root) => root.unitId),
    ),
    grants: new Map(grants.map((grant) => [grant.id, grant])),
  };
}

function getAncestry(
  snapshot: AuthoritySnapshot,
  unitId: string,
): Ancestry | null {
  const unitIds: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = unitId;
  let rootUnitId: string | null = null;

  while (currentId !== null) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);

    const unit = snapshot.units.get(currentId);
    if (!unit || unit.rootUnitId === null || !snapshot.roots.has(unit.rootUnitId)) {
      return null;
    }
    if (rootUnitId === null) rootUnitId = unit.rootUnitId;
    if (unit.rootUnitId !== rootUnitId) return null;

    unitIds.push(unit.id);
    currentId = unit.parentId;
  }

  if (rootUnitId === null || unitIds.at(-1) !== rootUnitId) return null;

  const root = snapshot.units.get(rootUnitId);
  if (!root || root.parentId !== null || root.rootUnitId !== rootUnitId) {
    return null;
  }

  return { unitIds, rootUnitId };
}

function coversTarget(
  grant: GrantRecord,
  anchorAncestry: Ancestry,
  targetAncestry: Ancestry,
): boolean {
  if (anchorAncestry.rootUnitId !== targetAncestry.rootUnitId) return false;

  const distance = targetAncestry.unitIds.indexOf(
    anchorAncestry.unitIds[0],
  );
  if (distance < 0) return false;

  if (grant.permission === "MANAGE_STRUCTURE") {
    return distance > 0 && grant.scope === null;
  }

  if (grant.scope === "SELF") return distance === 0;
  if (grant.scope === "SELF_AND_CHILDREN") return distance <= 1;
  if (grant.scope === "SELF_AND_DESCENDANTS") return distance >= 0;
  return false;
}

function isGrantLineageValid(
  snapshot: AuthoritySnapshot,
  grant: GrantRecord,
  lineage: Set<string>,
): boolean {
  if (grant.revokedAt !== null || grant.membership === null) return false;
  if (lineage.has(grant.id)) return false;
  if (grant.permission === "MANAGE_STRUCTURE" && grant.scope !== null) {
    return false;
  }
  if (grant.permission !== "MANAGE_STRUCTURE" && grant.scope === null) {
    return false;
  }

  const membershipAncestry = getAncestry(snapshot, grant.membership.unitId);
  if (membershipAncestry === null) return false;

  if (grant.delegatedFromGrantId === null) return true;

  const source = snapshot.grants.get(grant.delegatedFromGrantId);
  if (
    source === undefined ||
    source.id === grant.id ||
    source.permission !== grant.permission
  ) {
    return false;
  }

  const nextLineage = new Set(lineage);
  nextLineage.add(grant.id);
  if (!isGrantLineageValid(snapshot, source, nextLineage)) return false;
  if (source.membership === null) return false;

  const sourceAncestry = getAncestry(snapshot, source.membership.unitId);
  return (
    sourceAncestry !== null &&
    coversTarget(source, sourceAncestry, membershipAncestry)
  );
}

export async function hasEffectiveUnitPermission(
  userId: string,
  unitId: string,
  permission: Permission,
): Promise<boolean> {
  if (userId.trim() === "" || unitId.trim() === "") return false;

  const { prisma } = await import("@/lib/prisma");
  const [user, snapshot] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(),
  ]);
  if (user === null) return false;

  const targetAncestry = getAncestry(snapshot, unitId);
  if (targetAncestry === null) return false;

  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission !== permission ||
      grant.membership === null ||
      grant.membership.userId !== userId ||
      !isGrantLineageValid(snapshot, grant, new Set())
    ) {
      continue;
    }

    const anchorAncestry = getAncestry(snapshot, grant.membership.unitId);
    if (
      anchorAncestry !== null &&
      coversTarget(grant, anchorAncestry, targetAncestry)
    ) {
      return true;
    }
  }

  return false;
}

export function canManageUnit(userId: string, unitId: string): Promise<boolean> {
  return hasEffectiveUnitPermission(userId, unitId, "MANAGE_UNIT");
}

export function canManageRoster(
  userId: string,
  unitId: string,
): Promise<boolean> {
  return hasEffectiveUnitPermission(userId, unitId, "MANAGE_ROSTER");
}

export function canManageAuthorizedUsers(
  userId: string,
  unitId: string,
): Promise<boolean> {
  return hasEffectiveUnitPermission(
    userId,
    unitId,
    "MANAGE_AUTHORIZED_USERS",
  );
}

export function canRequestEventParticipation(
  userId: string,
  unitId: string,
): Promise<boolean> {
  return hasEffectiveUnitPermission(
    userId,
    unitId,
    "REQUEST_EVENT_PARTICIPATION",
  );
}