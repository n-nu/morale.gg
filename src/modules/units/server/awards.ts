import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { getCurrentUnitIdsForPlayer } from "@/modules/players/server/queries";
import { prisma } from "@/lib/prisma";

import { canManageAwards, canManageRootAwardCatalog } from "./authorization";
import {
  UnitManagementError,
  requiredText,
  validateAward,
  validateAwardCategory,
} from "../validation";

type AwardDatabase = Pick<
  Prisma.TransactionClient,
  | "user"
  | "unit"
  | "rootUnit"
  | "player"
  | "permissionGrant"
  | "authorizedUserMembership"
  | "awardDefinition"
  | "playerAwardGrant"
  | "unitAwardGrant"
  | "unitMembership"
>;

type PlayerMembershipDatabase = Pick<Prisma.TransactionClient, "unitMembership">;

type AwardDependencies = {
  db?: PrismaClient;
  getUserId?: () => Promise<string | null>;
  getCurrentUnitIdsForPlayer?: (
    playerId: string,
    db?: PlayerMembershipDatabase,
  ) => Promise<string[]>;
};

function duplicateName(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireUser(
  getUserId: () => Promise<string | null>,
): Promise<string> {
  const userId = await getUserId();
  if (!userId?.trim()) throw new UnitManagementError("Sign in to manage Awards.");
  return userId;
}

async function requireRootCatalogAccess(
  userId: string,
  rootUnitId: string,
  database: AwardDatabase,
) {
  if (!(await canManageRootAwardCatalog(userId, rootUnitId, database))) {
    throw new UnitManagementError("Manage Awards at this RootUnit to edit its Award definitions.");
  }
}

export async function listRootAwards(
  rootUnitIdValue: unknown,
  categoryValue: unknown,
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  const category = validateAwardCategory(categoryValue);
  const userId = await requireUser(getUserId);
  await requireRootCatalogAccess(userId, rootUnitId, db);

  const awards = await db.awardDefinition.findMany({
    where: { rootUnitId, category },
    select: {
      id: true,
      category: true,
      name: true,
      description: true,
      imageRef: true,
      sortOrder: true,
      _count: { select: { playerGrants: true, unitGrants: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return awards.map(({ _count, ...award }) => ({
    ...award,
    quantityAwarded: category === "PLAYER" ? _count.playerGrants : _count.unitGrants,
  }));
}

export async function createRootAward(
  input: {
    rootUnitId: unknown;
    category: unknown;
    name: unknown;
    description: unknown;
    imageRef: unknown;
    sortOrder: unknown;
  },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const award = validateAward(input);
  try {
    return await db.$transaction(async (tx) => {
      const userId = await requireUser(getUserId);
      await requireRootCatalogAccess(userId, rootUnitId, tx);
      if (!(await tx.rootUnit.findUnique({ where: { unitId: rootUnitId }, select: { unitId: true } }))) {
        throw new UnitManagementError("RootUnit not found.");
      }
      return tx.awardDefinition.create({ data: { rootUnitId, ...award } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (duplicateName(error)) throw new UnitManagementError("Award name is already used in this category.");
    throw error;
  }
}

export async function updateRootAward(
  input: {
    rootUnitId: unknown;
    awardId: unknown;
    category: unknown;
    name: unknown;
    description: unknown;
    imageRef: unknown;
    sortOrder: unknown;
  },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const awardId = requiredText(input.awardId, "Award");
  const award = validateAward(input);
  try {
    return await db.$transaction(async (tx) => {
      const userId = await requireUser(getUserId);
      await requireRootCatalogAccess(userId, rootUnitId, tx);
      const current = await tx.awardDefinition.findFirst({
        where: { id: awardId, rootUnitId },
        select: { category: true },
      });
      if (!current) throw new UnitManagementError("Award not found in this RootUnit.");
      if (current.category !== award.category) {
        throw new UnitManagementError("An Award cannot be moved between categories.");
      }
      await tx.awardDefinition.update({
        where: { id: awardId },
        data: {
          name: award.name,
          description: award.description,
          imageRef: award.imageRef,
          sortOrder: award.sortOrder,
        },
      });
      return tx.awardDefinition.findUniqueOrThrow({ where: { id: awardId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (duplicateName(error)) throw new UnitManagementError("Award name is already used in this category.");
    throw error;
  }
}

export async function deleteRootAward(
  rootUnitIdValue: unknown,
  awardIdValue: unknown,
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  const awardId = requiredText(awardIdValue, "Award");
  return db.$transaction(async (tx) => {
    const userId = await requireUser(getUserId);
    await requireRootCatalogAccess(userId, rootUnitId, tx);
    const award = await tx.awardDefinition.findFirst({
      where: { id: awardId, rootUnitId },
      select: {
        id: true,
        _count: { select: { playerGrants: true, unitGrants: true } },
      },
    });
    if (!award) throw new UnitManagementError("Award not found in this RootUnit.");
    if (award._count.playerGrants > 0 || award._count.unitGrants > 0) {
      throw new UnitManagementError("Remove this Award from all Players and Units before deleting its definition.");
    }
    await tx.awardDefinition.delete({ where: { id: awardId } });
    return { id: awardId, rootUnitId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getUnitAwards(unitIdValue: unknown, database: AwardDatabase = prisma) {
  const unitId = requiredText(unitIdValue, "Unit");
  const grants = await database.unitAwardGrant.findMany({
    where: { unitId, award: { is: { category: "UNIT" } } },
    select: {
      award: {
        select: {
          id: true,
          rootUnitId: true,
          name: true,
          description: true,
          imageRef: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [
      { award: { sortOrder: "asc" } },
      { award: { name: "asc" } },
      { awardId: "asc" },
    ],
  });
  return grants.map(({ award }) => award);
}

export async function getPlayerAwards(playerIdValue: unknown, database: AwardDatabase = prisma) {
  const playerId = requiredText(playerIdValue, "Player");
  const grants = await database.playerAwardGrant.findMany({
    where: { playerId, award: { is: { category: "PLAYER" } } },
    select: {
      award: {
        select: {
          id: true,
          rootUnitId: true,
          name: true,
          description: true,
          imageRef: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [
      { award: { rootUnitId: "asc" } },
      { award: { sortOrder: "asc" } },
      { award: { name: "asc" } },
      { awardId: "asc" },
    ],
  });
  return grants.map(({ award }) => award);
}

export async function getUnitAwardManagementData(
  unitIdValue: unknown,
  database: AwardDatabase = prisma,
) {
  const unitId = requiredText(unitIdValue, "Unit");
  const unit = await database.unit.findUnique({
    where: { id: unitId },
    select: { id: true, rootUnitId: true },
  });
  if (!unit?.rootUnitId) return null;

  const [awards, assigned] = await Promise.all([
    database.awardDefinition.findMany({
      where: { rootUnitId: unit.rootUnitId, category: "UNIT" },
      select: { id: true, name: true, description: true, imageRef: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    }),
    getUnitAwards(unitId, database),
  ]);
  const assignedIds = new Set(assigned.map(({ id }) => id));
  return {
    assigned,
    available: awards.filter(({ id }) => !assignedIds.has(id)),
  };
}

export async function getPlayerAwardManagementData(
  userIdValue: unknown,
  playerIdValue: unknown,
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getPlayerUnitIds = dependencies.getCurrentUnitIdsForPlayer ?? getCurrentUnitIdsForPlayer;
  const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";
  const playerId = requiredText(playerIdValue, "Player");
  const awards = await getPlayerAwards(playerId, db);
  if (!userId) return { awards, available: [], manageableAwardIds: [] };

  const unitIds = await getPlayerUnitIds(playerId, db);
  const memberships = unitIds.length === 0
    ? []
    : await db.unit.findMany({
      where: { id: { in: unitIds }, rootUnitId: { not: null } },
      select: { id: true, rootUnitId: true },
    });
  const authorizedMemberships = await Promise.all(
    memberships.map(async (membership) => ({
      ...membership,
      allowed: await canManageAwards(userId, membership.id, db),
    })),
  );
  const rootUnitIds = [...new Set(
    authorizedMemberships.filter(({ allowed }) => allowed)
      .map(({ rootUnitId }) => rootUnitId)
      .filter((rootUnitId): rootUnitId is string => rootUnitId !== null),
  )];

  const availableAwards = rootUnitIds.length === 0
    ? []
    : await db.awardDefinition.findMany({
      where: { rootUnitId: { in: rootUnitIds }, category: "PLAYER" },
      select: { id: true, rootUnitId: true, name: true, description: true, imageRef: true, sortOrder: true },
      orderBy: [{ rootUnitId: "asc" }, { sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    });
  const rootsWithAssignedAwards = [...new Set(awards.map(({ rootUnitId }) => rootUnitId))];
  const cleanupRootUnitIds = (await Promise.all(
    rootsWithAssignedAwards.map(async (rootUnitId) => ({
      rootUnitId,
      allowed: await canManageRootAwardCatalog(userId, rootUnitId, db),
    })),
  )).filter(({ allowed }) => allowed).map(({ rootUnitId }) => rootUnitId);
  const assignedIds = new Set(awards.map(({ id }) => id));
  return {
    awards,
    available: availableAwards.filter(({ id }) => !assignedIds.has(id)),
    manageableAwardIds: awards
      .filter(({ rootUnitId }) => (
        rootUnitIds.includes(rootUnitId)
        || (!memberships.some((membership) => membership.rootUnitId === rootUnitId)
          && cleanupRootUnitIds.includes(rootUnitId))
      ))
      .map(({ id }) => id),
  };
}

async function requireUnitAwardAccess(
  userId: string,
  unitId: string,
  database: AwardDatabase,
) {
  if (!(await canManageAwards(userId, unitId, database))) {
    throw new UnitManagementError("You are not authorized to manage Awards for this Unit.");
  }
  const unit = await database.unit.findUnique({
    where: { id: unitId },
    select: { id: true, rootUnitId: true },
  });
  if (!unit?.rootUnitId) throw new UnitManagementError("Unit not found in a RootUnit.");
  return { id: unit.id, rootUnitId: unit.rootUnitId };
}

async function requirePlayerAwardAccess(
  userId: string,
  playerId: string,
  rootUnitId: string,
  database: AwardDatabase,
  getPlayerUnitIds: (playerId: string, database?: PlayerMembershipDatabase) => Promise<string[]>,
) {
  const unitIds = await getPlayerUnitIds(playerId, database);
  if (unitIds.length === 0) {
    throw new UnitManagementError("The Player needs an active Unit membership in this RootUnit.");
  }
  const memberships = await database.unit.findMany({
    where: { id: { in: unitIds }, rootUnitId },
    select: { id: true },
  });
  if (memberships.length === 0) {
    throw new UnitManagementError("The Player has no active Unit membership in this Award's RootUnit.");
  }
  const authorized = await Promise.all(
    memberships.map(({ id }) => canManageAwards(userId, id, database)),
  );
  if (!authorized.some(Boolean)) {
    throw new UnitManagementError("Manage Awards for a Unit this Player currently belongs to.");
  }
}

async function requirePlayerAwardRemovalAccess(
  userId: string,
  playerId: string,
  rootUnitId: string,
  database: AwardDatabase,
  getPlayerUnitIds: (playerId: string, database?: PlayerMembershipDatabase) => Promise<string[]>,
) {
  const unitIds = await getPlayerUnitIds(playerId, database);
  const memberships = unitIds.length === 0
    ? []
    : await database.unit.findMany({
      where: { id: { in: unitIds }, rootUnitId },
      select: { id: true },
    });
  if (memberships.length === 0) {
    if (await canManageRootAwardCatalog(userId, rootUnitId, database)) return;
    throw new UnitManagementError(
      "Only the RootUnit owner or a full-root Award manager can remove an orphaned Player Award.",
    );
  }
  const authorized = await Promise.all(
    memberships.map(({ id }) => canManageAwards(userId, id, database)),
  );
  if (!authorized.some(Boolean)) {
    throw new UnitManagementError("Manage Awards for a Unit this Player currently belongs to.");
  }
}

export async function grantUnitAward(
  input: { unitId: unknown; awardId: unknown },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const unitId = requiredText(input.unitId, "Unit");
  const awardId = requiredText(input.awardId, "Award");
  try {
    return await db.$transaction(async (tx) => {
      const userId = await requireUser(getUserId);
      const unit = await requireUnitAwardAccess(userId, unitId, tx);
      const award = await tx.awardDefinition.findFirst({
        where: { id: awardId, category: "UNIT", rootUnitId: unit.rootUnitId },
        select: { id: true },
      });
      if (!award) throw new UnitManagementError("Select a Unit Award from this RootUnit.");
      await tx.unitAwardGrant.create({ data: { unitId, awardId } });
      return { unitId, rootUnitId: unit.rootUnitId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (duplicateName(error)) throw new UnitManagementError("This Unit already holds that Award.");
    throw error;
  }
}

export async function removeUnitAward(
  input: { unitId: unknown; awardId: unknown },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const unitId = requiredText(input.unitId, "Unit");
  const awardId = requiredText(input.awardId, "Award");
  return db.$transaction(async (tx) => {
    const userId = await requireUser(getUserId);
    const unit = await requireUnitAwardAccess(userId, unitId, tx);
    const result = await tx.unitAwardGrant.deleteMany({
      where: {
        unitId,
        awardId,
        award: { is: { rootUnitId: unit.rootUnitId, category: "UNIT" } },
      },
    });
    if (result.count !== 1) throw new UnitManagementError("This Unit does not currently hold that Award.");
    return { unitId, rootUnitId: unit.rootUnitId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function grantPlayerAward(
  input: { playerId: unknown; awardId: unknown },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const getPlayerUnitIds = dependencies.getCurrentUnitIdsForPlayer ?? getCurrentUnitIdsForPlayer;
  const playerId = requiredText(input.playerId, "Player");
  const awardId = requiredText(input.awardId, "Award");
  try {
    return await db.$transaction(async (tx) => {
      const userId = await requireUser(getUserId);
      if (!(await tx.player.findUnique({ where: { playerId }, select: { playerId: true } }))) {
        throw new UnitManagementError("Player not found.");
      }
      const award = await tx.awardDefinition.findFirst({
        where: { id: awardId, category: "PLAYER" },
        select: { id: true, rootUnitId: true },
      });
      if (!award) throw new UnitManagementError("Select a Player Award.");
      await requirePlayerAwardAccess(userId, playerId, award.rootUnitId, tx, getPlayerUnitIds);
      await tx.playerAwardGrant.create({ data: { playerId, awardId } });
      return { playerId, rootUnitId: award.rootUnitId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (duplicateName(error)) throw new UnitManagementError("This Player already holds that Award.");
    throw error;
  }
}

export async function removePlayerAward(
  input: { playerId: unknown; awardId: unknown },
  dependencies: AwardDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const getPlayerUnitIds = dependencies.getCurrentUnitIdsForPlayer ?? getCurrentUnitIdsForPlayer;
  const playerId = requiredText(input.playerId, "Player");
  const awardId = requiredText(input.awardId, "Award");
  return db.$transaction(async (tx) => {
    const userId = await requireUser(getUserId);
    const award = await tx.awardDefinition.findFirst({
      where: { id: awardId, category: "PLAYER" },
      select: { id: true, rootUnitId: true },
    });
    if (!award) throw new UnitManagementError("Player Award not found.");
    await requirePlayerAwardRemovalAccess(userId, playerId, award.rootUnitId, tx, getPlayerUnitIds);
    const result = await tx.playerAwardGrant.deleteMany({
      where: { playerId, awardId },
    });
    if (result.count !== 1) throw new UnitManagementError("This Player does not currently hold that Award.");
    return { playerId, rootUnitId: award.rootUnitId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
