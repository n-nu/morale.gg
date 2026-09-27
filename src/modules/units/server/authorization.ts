import "server-only";

import type { Permission, PermissionScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuthorityDatabase = Pick<
  Prisma.TransactionClient,
  "user" | "unit" | "rootUnit" | "permissionGrant" | "authorizedUserMembership"
>;

type UnitRecord = {
  id: string;
  parentId: string | null;
  rootUnitId: string | null;
  commanderUserId: string;
};

type GrantRecord = {
  id: string;
  authorizedUserMembershipId: string;
  permission: Permission;
  scope: PermissionScope | null;
  delegatedFromGrantId: string | null;
  revokedAt: Date | null;
  membership: {
    id: string;
    userId: string;
    unitId: string;
    authorityLevel: number;
    endedAt: Date | null;
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

async function loadAuthoritySnapshot(
  database: AuthorityDatabase = prisma,
): Promise<AuthoritySnapshot> {
  const [units, roots, grants] = await Promise.all([
    database.unit.findMany({
      select: { id: true, parentId: true, rootUnitId: true, commanderUserId: true },
    }),
    database.rootUnit.findMany({
      select: { unitId: true, designatedUnit: { select: { id: true } } },
    }),
    database.permissionGrant.findMany({
      select: {
        id: true,
        authorizedUserMembershipId: true,
        permission: true,
        scope: true,
        delegatedFromGrantId: true,
        revokedAt: true,
        membership: {
          select: {
            id: true,
            userId: true,
            unitId: true,
            authorityLevel: true,
            endedAt: true,
          },
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
  if (
    grant.revokedAt !== null ||
    grant.membership === null ||
    grant.membership.endedAt !== null
  ) {
    return false;
  }
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
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (userId.trim() === "" || unitId.trim() === "") return false;

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
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

export async function canCreateEvent(
  userId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (userId.trim() === "") return false;

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null) return false;

  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission === "MANAGE_EVENTS" &&
      grant.membership?.userId === userId &&
      isGrantLineageValid(snapshot, grant, new Set())
    ) {
      return true;
    }
  }

  return false;
}

export async function canManageRootSettings(
  userId: string,
  rootUnitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (userId.trim() === "" || rootUnitId.trim() === "") return false;

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null || !snapshot.roots.has(rootUnitId)) return false;

  const root = snapshot.units.get(rootUnitId);
  return (
    root !== undefined &&
    root.parentId === null &&
    root.rootUnitId === rootUnitId &&
    root.commanderUserId === userId
  );
}

function actorHasStructuralAnchor(
  snapshot: AuthoritySnapshot,
  userId: string,
  sourceAncestry: Ancestry,
  destinationAncestry?: Ancestry,
  allowSourceAnchor = false,
): boolean {
  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission !== "MANAGE_STRUCTURE" ||
      grant.membership?.userId !== userId ||
      !isGrantLineageValid(snapshot, grant, new Set())
    ) {
      continue;
    }

    const anchorAncestry = getAncestry(snapshot, grant.membership.unitId);
    if (
      anchorAncestry === null ||
      anchorAncestry.rootUnitId !== sourceAncestry.rootUnitId ||
      destinationAncestry?.rootUnitId !== undefined &&
        anchorAncestry.rootUnitId !== destinationAncestry.rootUnitId
    ) {
      continue;
    }

    const sourceDistance = sourceAncestry.unitIds.indexOf(
      anchorAncestry.unitIds[0],
    );
    if (sourceDistance < 0 || (!allowSourceAnchor && sourceDistance === 0)) {
      continue;
    }

    if (destinationAncestry !== undefined) {
      const destinationDistance = destinationAncestry.unitIds.indexOf(
        anchorAncestry.unitIds[0],
      );
      if (destinationDistance < 0) continue;
    }

    return true;
  }

  return false;
}

function actorHasPermissionForProspectiveChild(
  snapshot: AuthoritySnapshot,
  userId: string,
  parentAncestry: Ancestry,
): boolean {
  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission !== "MANAGE_AUTHORIZED_USERS" ||
      grant.membership?.userId !== userId ||
      !isGrantLineageValid(snapshot, grant, new Set())
    ) {
      continue;
    }

    const membershipAncestry = getAncestry(snapshot, grant.membership.unitId);
    if (
      membershipAncestry === null ||
      membershipAncestry.rootUnitId !== parentAncestry.rootUnitId
    ) {
      continue;
    }

    const parentDistance = parentAncestry.unitIds.indexOf(
      membershipAncestry.unitIds[0],
    );
    if (parentDistance < 0) continue;

    const childDistance = parentDistance + 1;
    if (
      grant.scope === "SELF_AND_CHILDREN" &&
      childDistance <= 1
    ) {
      return true;
    }
    if (
      grant.scope === "SELF_AND_DESCENDANTS" &&
      childDistance >= 0
    ) {
      return true;
    }
  }

  return false;
}

export async function canCreateChildUnit(
  userId: string,
  parentUnitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (userId.trim() === "" || parentUnitId.trim() === "") return false;

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null) return false;

  const parentAncestry = getAncestry(snapshot, parentUnitId);
  if (parentAncestry === null) return false;

  const isAncestorCommander = parentAncestry.unitIds.some(
    (unitId) => snapshot.units.get(unitId)?.commanderUserId === userId,
  );
  return (
    isAncestorCommander &&
    actorHasStructuralAnchor(snapshot, userId, parentAncestry, undefined, true) &&
    actorHasPermissionForProspectiveChild(snapshot, userId, parentAncestry)
  );
}

export async function canMoveUnit(
  userId: string,
  unitId: string,
  destinationParentId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (
    userId.trim() === "" ||
    unitId.trim() === "" ||
    destinationParentId.trim() === ""
  ) {
    return false;
  }

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null) return false;

  const sourceAncestry = getAncestry(snapshot, unitId);
  const destinationAncestry = getAncestry(snapshot, destinationParentId);
  if (
    sourceAncestry === null ||
    destinationAncestry === null ||
    sourceAncestry.rootUnitId !== destinationAncestry.rootUnitId ||
    destinationAncestry.unitIds.includes(unitId)
  ) {
    return false;
  }

  return actorHasStructuralAnchor(
    snapshot,
    userId,
    sourceAncestry,
    destinationAncestry,
  );
}

export async function canDeleteUnit(
  userId: string,
  unitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (userId.trim() === "" || unitId.trim() === "") return false;

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null) return false;

  const targetAncestry = getAncestry(snapshot, unitId);
  if (targetAncestry === null) return false;

  return actorHasStructuralAnchor(snapshot, userId, targetAncestry);
}

function actorCanManageAuthorityLevel(
  snapshot: AuthoritySnapshot,
  userId: string,
  targetUnitId: string,
  targetAuthorityLevel: number,
): boolean {
  const targetAncestry = getAncestry(snapshot, targetUnitId);
  if (targetAncestry === null) return false;

  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission !== "MANAGE_AUTHORIZED_USERS" ||
      grant.membership?.userId !== userId ||
      !isGrantLineageValid(snapshot, grant, new Set())
    ) {
      continue;
    }

    const membershipAncestry = getAncestry(snapshot, grant.membership.unitId);
    if (
      membershipAncestry === null ||
      !coversTarget(grant, membershipAncestry, targetAncestry)
    ) {
      continue;
    }

    if (grant.membership.unitId !== targetUnitId) {
      if (targetAncestry.unitIds.includes(grant.membership.unitId)) return true;
      continue;
    }

    if (grant.membership.authorityLevel < targetAuthorityLevel) return true;
  }

  return false;
}

export async function canManageAuthorizedUser(
  userId: string,
  targetMembershipId: string,
  unitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (
    userId.trim() === "" ||
    targetMembershipId.trim() === "" ||
    unitId.trim() === ""
  ) {
    return false;
  }

  const [user, target, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    database.authorizedUserMembership.findFirst({
      where: { id: targetMembershipId, unitId, endedAt: null },
      select: { unitId: true, authorityLevel: true },
    }),
    loadAuthoritySnapshot(database),
  ]);
  if (user === null || target === null) return false;

  return actorCanManageAuthorityLevel(
    snapshot,
    userId,
    target.unitId,
    target.authorityLevel,
  );
}

export async function canAddAuthorizedUser(
  userId: string,
  unitId: string,
  authorityLevel: number,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  if (
    userId.trim() === "" ||
    unitId.trim() === "" ||
    !Number.isInteger(authorityLevel) ||
    authorityLevel < 1
  ) {
    return false;
  }

  const [user, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    loadAuthoritySnapshot(database),
  ]);
  return (
    user !== null &&
    actorCanManageAuthorityLevel(snapshot, userId, unitId, authorityLevel)
  );
}

function delegatedScopeIsNarrower(
  sourceScope: PermissionScope,
  requestedScope: PermissionScope,
): boolean {
  if (sourceScope === "SELF_AND_CHILDREN") return requestedScope === "SELF";
  if (sourceScope === "SELF_AND_DESCENDANTS") {
    return requestedScope === "SELF" || requestedScope === "SELF_AND_CHILDREN";
  }
  return false;
}

export async function getDelegationSourceGrantId(
  userId: string,
  targetMembershipId: string,
  targetUnitId: string,
  permission: Permission,
  scope: PermissionScope | null,
  database: AuthorityDatabase = prisma,
): Promise<string | null> {
  if (
    userId.trim() === "" ||
    targetMembershipId.trim() === "" ||
    targetUnitId.trim() === ""
  ) {
    return null;
  }

  const [user, target, snapshot] = await Promise.all([
    database.user.findUnique({ where: { id: userId }, select: { id: true } }),
    database.authorizedUserMembership.findFirst({
      where: { id: targetMembershipId, unitId: targetUnitId, endedAt: null },
      select: { unitId: true, authorityLevel: true },
    }),
    loadAuthoritySnapshot(database),
  ]);
  if (
    user === null ||
    target === null ||
    !actorCanManageAuthorityLevel(
      snapshot,
      userId,
      target.unitId,
      target.authorityLevel,
    )
  ) {
    return null;
  }

  const targetAncestry = getAncestry(snapshot, targetUnitId);
  if (targetAncestry === null) return null;

  for (const grant of snapshot.grants.values()) {
    if (
      grant.permission !== permission ||
      grant.membership?.userId !== userId ||
      !isGrantLineageValid(snapshot, grant, new Set())
    ) {
      continue;
    }

    const anchorAncestry = getAncestry(snapshot, grant.membership.unitId);
    if (
      anchorAncestry === null ||
      anchorAncestry.rootUnitId !== targetAncestry.rootUnitId
    ) {
      continue;
    }

    if (permission === "MANAGE_STRUCTURE") {
      if (
        scope === null &&
        grant.scope === null &&
        targetAncestry.unitIds.indexOf(anchorAncestry.unitIds[0]) > 0
      ) {
        return grant.id;
      }
      continue;
    }

    if (
      scope !== null &&
      grant.scope !== null &&
      delegatedScopeIsNarrower(grant.scope, scope) &&
      coversTarget(grant, anchorAncestry, targetAncestry)
    ) {
      return grant.id;
    }
  }

  return null;
}

export function canManageUnit(
  userId: string,
  unitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  return hasEffectiveUnitPermission(userId, unitId, "MANAGE_UNIT", database);
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
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  return hasEffectiveUnitPermission(
    userId,
    unitId,
    "MANAGE_AUTHORIZED_USERS",
    database,
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

export function canSubmitAudit(
  userId: string,
  unitId: string,
  database: AuthorityDatabase = prisma,
): Promise<boolean> {
  return hasEffectiveUnitPermission(userId, unitId, "SUBMIT_AUDITS", database);
}