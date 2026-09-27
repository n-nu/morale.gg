import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";

import { canManageRootSettings } from "./authorization";
import {
  UnitManagementError,
  requiredText,
  validateMedal,
  validateRank,
} from "../validation";

type CatalogDependencies = {
  db?: PrismaClient;
  getUserId?: () => Promise<string | null>;
};

type CatalogDatabase = Pick<
  Prisma.TransactionClient,
  "user" | "unit" | "rootUnit" | "permissionGrant" | "authorizedUserMembership"
>;

async function requireOwner(
  rootUnitId: string,
  getUserId: () => Promise<string | null>,
  tx?: Prisma.TransactionClient,
  database: CatalogDatabase = prisma,
) {
  const userId = await getUserId();
  if (!userId?.trim()) throw new UnitManagementError("Sign in to manage organization settings.");
  if (!(await canManageRootSettings(userId, rootUnitId, tx ?? database))) {
    throw new UnitManagementError("Only this RootUnit's current owner can manage its catalogs.");
  }
  return userId;
}

function duplicateName(error: unknown, label: string): never | void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new UnitManagementError(`${label} name is already used in this organization.`);
  }
}

export async function listRootRanks(rootUnitIdValue: unknown, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  await requireOwner(rootUnitId, getUserId, undefined, db);
  return db.rankDefinition.findMany({
    where: { rootUnitId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}

export async function createRootRank(input: {
  rootUnitId: unknown;
  name: unknown;
  description: unknown;
  sortOrder: unknown;
}, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const rank = validateRank(input);
  try {
    return await db.$transaction(async (tx) => {
      await requireOwner(rootUnitId, getUserId, tx, db);
      if (!(await tx.rootUnit.findUnique({ where: { unitId: rootUnitId }, select: { unitId: true } }))) {
        throw new UnitManagementError("RootUnit not found.");
      }
      return tx.rankDefinition.create({ data: { rootUnitId, ...rank } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    duplicateName(error, "Rank");
    throw error;
  }
}

export async function updateRootRank(input: {
  rootUnitId: unknown;
  rankId: unknown;
  name: unknown;
  description: unknown;
  sortOrder: unknown;
}, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const rankId = requiredText(input.rankId, "Rank");
  const rank = validateRank(input);
  try {
    return await db.$transaction(async (tx) => {
      await requireOwner(rootUnitId, getUserId, tx, db);
      const result = await tx.rankDefinition.updateMany({
        where: { id: rankId, rootUnitId },
        data: rank,
      });
      if (result.count !== 1) throw new UnitManagementError("Rank not found in this RootUnit.");
      return tx.rankDefinition.findUniqueOrThrow({ where: { id: rankId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    duplicateName(error, "Rank");
    throw error;
  }
}

export async function deleteRootRank(
  rootUnitIdValue: unknown,
  rankIdValue: unknown,
  dependencies: CatalogDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  const rankId = requiredText(rankIdValue, "Rank");
  return db.$transaction(async (tx) => {
    await requireOwner(rootUnitId, getUserId, tx, db);
    const result = await tx.rankDefinition.deleteMany({ where: { id: rankId, rootUnitId } });
    if (result.count !== 1) throw new UnitManagementError("Rank not found in this RootUnit.");
    return { id: rankId, rootUnitId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listRootMedals(rootUnitIdValue: unknown, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  await requireOwner(rootUnitId, getUserId, undefined, db);
  return db.medalDefinition.findMany({
    where: { rootUnitId },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function createRootMedal(input: {
  rootUnitId: unknown;
  name: unknown;
  description: unknown;
  imageRef: unknown;
}, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const medal = validateMedal(input);
  try {
    return await db.$transaction(async (tx) => {
      await requireOwner(rootUnitId, getUserId, tx, db);
      if (!(await tx.rootUnit.findUnique({ where: { unitId: rootUnitId }, select: { unitId: true } }))) {
        throw new UnitManagementError("RootUnit not found.");
      }
      return tx.medalDefinition.create({ data: { rootUnitId, ...medal } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    duplicateName(error, "Medal");
    throw error;
  }
}

export async function updateRootMedal(input: {
  rootUnitId: unknown;
  medalId: unknown;
  name: unknown;
  description: unknown;
  imageRef: unknown;
}, dependencies: CatalogDependencies = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(input.rootUnitId, "RootUnit");
  const medalId = requiredText(input.medalId, "Medal");
  const medal = validateMedal(input);
  try {
    return await db.$transaction(async (tx) => {
      await requireOwner(rootUnitId, getUserId, tx, db);
      const result = await tx.medalDefinition.updateMany({
        where: { id: medalId, rootUnitId },
        data: medal,
      });
      if (result.count !== 1) throw new UnitManagementError("Medal not found in this RootUnit.");
      return tx.medalDefinition.findUniqueOrThrow({ where: { id: medalId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    duplicateName(error, "Medal");
    throw error;
  }
}

export async function deleteRootMedal(
  rootUnitIdValue: unknown,
  medalIdValue: unknown,
  dependencies: CatalogDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;
  const rootUnitId = requiredText(rootUnitIdValue, "RootUnit");
  const medalId = requiredText(medalIdValue, "Medal");
  return db.$transaction(async (tx) => {
    await requireOwner(rootUnitId, getUserId, tx, db);
    const result = await tx.medalDefinition.deleteMany({ where: { id: medalId, rootUnitId } });
    if (result.count !== 1) throw new UnitManagementError("Medal not found in this RootUnit.");
    return { id: medalId, rootUnitId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}