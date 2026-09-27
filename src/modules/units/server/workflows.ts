import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";

import {
  canAddAuthorizedUser,
  canCreateChildUnit,
  canDeleteUnit,
  canManageAuthorizedUser,
  canManageUnit,
  canMoveUnit,
  getDelegationSourceGrantId,
} from "./authorization";
import {
  UnitManagementError,
  requiredText,
  validateAuthorityLevel,
  validateGrant,
  validateUnitProfile,
} from "../validation";

type UnitDatabase = PrismaClient;

function isKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function validEmail(value: unknown): string {
  const email = requiredText(value, "Email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new UnitManagementError("Enter a valid website account email.");
  }
  return email;
}

async function destinationContainsUnit(
  tx: Prisma.TransactionClient,
  destinationParentId: string,
  unitId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  let currentId: string | null = destinationParentId;

  while (currentId !== null) {
    if (currentId === unitId) return true;
    if (visited.has(currentId)) {
      throw new UnitManagementError("The stored Unit hierarchy contains a cycle.");
    }
    visited.add(currentId);
    const current: { parentId: string | null } | null = await tx.unit.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (current === null) {
      throw new UnitManagementError("The destination Unit no longer exists.");
    }
    currentId = current.parentId;
  }

  return false;
}

export function unitWorkflows(dependencies: {
  db?: UnitDatabase;
  getUserId?: () => Promise<string | null>;
} = {}) {
  const db = dependencies.db ?? prisma;
  const getUserId = dependencies.getUserId ?? getAuthenticatedUserId;

  async function authenticatedUserId(): Promise<string> {
    const userId = await getUserId();
    if (!userId?.trim()) {
      throw new UnitManagementError("Sign in to manage this Unit.");
    }
    return userId;
  }

  return {
    async updateUnitProfile(input: {
      unitId: unknown;
      name: unknown;
      description: unknown;
      imageRef: unknown;
      discordInvite: unknown;
      groupLink: unknown;
    }) {
      const userId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const profile = validateUnitProfile(input);

      return db.$transaction(async (tx) => {
        const unit = await tx.unit.findUnique({ where: { id: unitId }, select: { id: true } });
        if (!unit) throw new UnitManagementError("Unit not found.");
        if (!(await canManageUnit(userId, unitId, tx))) {
          throw new UnitManagementError("You do not have permission to manage this Unit profile.");
        }
        return tx.unit.update({ where: { id: unitId }, data: profile });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async addAuthorizedUser(input: {
      unitId: unknown;
      email: unknown;
      authorityLevel: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const email = validEmail(input.email);
      const authorityLevel = validateAuthorityLevel(input.authorityLevel);

      try {
        return await db.$transaction(async (tx) => {
          if (!(await tx.unit.findUnique({ where: { id: unitId }, select: { id: true } }))) {
            throw new UnitManagementError("Unit not found.");
          }
          const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
          if (!user) {
            throw new UnitManagementError(
              "No website account uses that email. The person must sign in once before they can be added.",
            );
          }
          const active = await tx.authorizedUserMembership.findFirst({
            where: { userId: user.id, unitId, endedAt: null },
            select: { id: true },
          });
          if (active) throw new UnitManagementError("This User is already authorized for the Unit.");
          if (!(await canAddAuthorizedUser(actingUserId, unitId, authorityLevel, tx))) {
            throw new UnitManagementError("You do not have authority to add a User at that level.");
          }
          return tx.authorizedUserMembership.create({
            data: { userId: user.id, unitId, authorityLevel, createdByUserId: actingUserId },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isKnownError(error, "P2002")) {
          throw new UnitManagementError("This User already has an active membership in the Unit.");
        }
        if (isKnownError(error, "P2003")) {
          throw new UnitManagementError("The Unit or website account no longer exists.");
        }
        throw error;
      }
    },

    async updateAuthorizedUserLevel(input: {
      unitId: unknown;
      membershipId: unknown;
      authorityLevel: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const membershipId = requiredText(input.membershipId, "Membership");
      const authorityLevel = validateAuthorityLevel(input.authorityLevel);

      return db.$transaction(async (tx) => {
        const membership = await tx.authorizedUserMembership.findFirst({
          where: { id: membershipId, unitId, endedAt: null },
          select: { id: true, userId: true, authorityLevel: true },
        });
        if (!membership) throw new UnitManagementError("Active authorized membership not found.");
        const unit = await tx.unit.findUnique({
          where: { id: unitId },
          select: { commanderUserId: true },
        });
        if (membership.authorityLevel === 0 || unit?.commanderUserId === membership.userId) {
          throw new UnitManagementError("The current Commander must be changed through the separate Commander workflow.");
        }
        if (!(await canManageAuthorizedUser(actingUserId, membershipId, unitId, tx))) {
          throw new UnitManagementError("You do not have authority to change this User's level.");
        }
        if (!(await canAddAuthorizedUser(actingUserId, unitId, authorityLevel, tx))) {
          throw new UnitManagementError("You cannot assign an authority level equal to or stronger than your own.");
        }
        const result = await tx.authorizedUserMembership.updateMany({
          where: { id: membershipId, unitId, endedAt: null, authorityLevel: membership.authorityLevel },
          data: { authorityLevel },
        });
        if (result.count !== 1) throw new UnitManagementError("The membership changed; reload and try again.");
        return { ...membership, authorityLevel };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async endAuthorizedUserMembership(input: {
      unitId: unknown;
      membershipId: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const membershipId = requiredText(input.membershipId, "Membership");

      return db.$transaction(async (tx) => {
        const membership = await tx.authorizedUserMembership.findFirst({
          where: { id: membershipId, unitId, endedAt: null },
          select: { id: true, userId: true, unitId: true, authorityLevel: true },
        });
        if (!membership) throw new UnitManagementError("Active authorized membership not found.");
        const unit = await tx.unit.findUnique({
          where: { id: unitId },
          select: { commanderUserId: true },
        });
        if (membership.authorityLevel === 0 || unit?.commanderUserId === membership.userId) {
          throw new UnitManagementError("The current Commander cannot be removed through ordinary authorized-user management.");
        }
        if (!(await canManageAuthorizedUser(actingUserId, membershipId, unitId, tx))) {
          throw new UnitManagementError("You do not have authority to remove this User.");
        }

        const endedAt = new Date();
        const result = await tx.authorizedUserMembership.updateMany({
          where: { id: membershipId, unitId, endedAt: null },
          data: { endedAt },
        });
        if (result.count !== 1) throw new UnitManagementError("This membership has already ended.");
        await tx.permissionGrant.updateMany({
          where: { authorizedUserMembershipId: membershipId, revokedAt: null },
          data: { revokedAt: endedAt, revokedByUserId: actingUserId },
        });
        return { ...membership, endedAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async grantPermission(input: {
      unitId: unknown;
      membershipId: unknown;
      permission: unknown;
      scope: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const membershipId = requiredText(input.membershipId, "Membership");
      const grant = validateGrant({ permission: input.permission, scope: input.scope });

      try {
        return await db.$transaction(async (tx) => {
          const membership = await tx.authorizedUserMembership.findFirst({
            where: { id: membershipId, unitId, endedAt: null },
            select: { id: true },
          });
          if (!membership) throw new UnitManagementError("Active authorized membership not found.");
          const sourceGrantId = await getDelegationSourceGrantId(
            actingUserId,
            membershipId,
            unitId,
            grant.permission,
            grant.scope,
            tx,
          );
          if (sourceGrantId === null) {
            throw new UnitManagementError("You cannot delegate this permission or scope to this User.");
          }
          return tx.permissionGrant.create({
            data: {
              authorizedUserMembershipId: membershipId,
              permission: grant.permission,
              scope: grant.scope,
              delegatedFromGrantId: sourceGrantId,
              createdByUserId: actingUserId,
            },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isKnownError(error, "P2002")) {
          throw new UnitManagementError("An equivalent grant already exists in this membership's history.");
        }
        throw error;
      }
    },

    async revokePermissionGrant(input: {
      unitId: unknown;
      membershipId: unknown;
      grantId: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const membershipId = requiredText(input.membershipId, "Membership");
      const grantId = requiredText(input.grantId, "Permission grant");

      return db.$transaction(async (tx) => {
        const grant = await tx.permissionGrant.findFirst({
          where: {
            id: grantId,
            authorizedUserMembershipId: membershipId,
            revokedAt: null,
            membership: { unitId, endedAt: null },
          },
          select: { id: true },
        });
        if (!grant) throw new UnitManagementError("Active permission grant not found.");
        if (!(await canManageAuthorizedUser(actingUserId, membershipId, unitId, tx))) {
          throw new UnitManagementError("You do not have authority to revoke this grant.");
        }
        const revokedAt = new Date();
        const result = await tx.permissionGrant.updateMany({
          where: { id: grantId, revokedAt: null },
          data: { revokedAt, revokedByUserId: actingUserId },
        });
        if (result.count !== 1) throw new UnitManagementError("This grant was already revoked.");
        return { id: grantId, revokedAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async createChildUnit(input: {
      parentUnitId: unknown;
      name: unknown;
      commanderEmail: unknown;
    }) {
      const actingUserId = await authenticatedUserId();
      const parentUnitId = requiredText(input.parentUnitId, "Parent Unit");
      const name = requiredText(input.name, "Unit name", 100);
      const email = validEmail(input.commanderEmail);

      try {
        return await db.$transaction(async (tx) => {
          const parent = await tx.unit.findUnique({
            where: { id: parentUnitId },
            select: { id: true, rootUnitId: true },
          });
          if (!parent || !parent.rootUnitId) throw new UnitManagementError("Parent Unit not found.");
          if (!(await canCreateChildUnit(actingUserId, parentUnitId, tx))) {
            throw new UnitManagementError("You are not authorized to create a child Unit here.");
          }
          const commander = await tx.user.findUnique({ where: { email }, select: { id: true } });
          if (!commander) {
            throw new UnitManagementError("The initial Commander must have an existing website account.");
          }
          const child = await tx.unit.create({
            data: {
              name,
              parentId: parentUnitId,
              rootUnitId: parent.rootUnitId,
              commanderUserId: commander.id,
            },
          });
          await tx.authorizedUserMembership.create({
            data: {
              userId: commander.id,
              unitId: child.id,
              authorityLevel: 0,
              createdByUserId: actingUserId,
            },
          });
          return child;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isKnownError(error, "P2003")) {
          throw new UnitManagementError("The parent Unit or initial Commander no longer exists.");
        }
        throw error;
      }
    },

    async moveUnit(input: { unitId: unknown; destinationParentId: unknown }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");
      const destinationParentId = requiredText(input.destinationParentId, "Destination parent");

      return db.$transaction(async (tx) => {
        const [unit, destination] = await Promise.all([
          tx.unit.findUnique({ where: { id: unitId }, select: { id: true, parentId: true, rootUnitId: true } }),
          tx.unit.findUnique({ where: { id: destinationParentId }, select: { id: true, rootUnitId: true } }),
        ]);
        if (!unit || !destination) throw new UnitManagementError("Unit or destination parent not found.");
        if (unit.parentId === null) throw new UnitManagementError("A RootUnit cannot be moved by the structural workflow.");
        if (unit.parentId === destinationParentId) throw new UnitManagementError("This Unit already has that parent.");
        if (unit.rootUnitId !== destination.rootUnitId) {
          throw new UnitManagementError("A Unit cannot be moved across RootUnit boundaries.");
        }
        if (await destinationContainsUnit(tx, destinationParentId, unitId)) {
          throw new UnitManagementError("A Unit cannot be moved beneath itself or one of its descendants.");
        }
        if (!(await canMoveUnit(actingUserId, unitId, destinationParentId, tx))) {
          throw new UnitManagementError("You are not authorized to move this Unit within the selected structure.");
        }
        return tx.unit.update({ where: { id: unitId }, data: { parentId: destinationParentId } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async deleteUnit(input: { unitId: unknown }) {
      const actingUserId = await authenticatedUserId();
      const unitId = requiredText(input.unitId, "Unit");

      try {
        return await db.$transaction(async (tx) => {
          const unit = await tx.unit.findUnique({
            where: { id: unitId },
            select: { id: true, parentId: true, commanderUserId: true },
          });
          if (!unit) throw new UnitManagementError("Unit not found.");
          if (!(await canDeleteUnit(actingUserId, unitId, tx))) {
            throw new UnitManagementError("You are not authorized to delete this Unit.");
          }

          const rootDesignation = await tx.rootUnit.findUnique({
            where: { unitId },
            select: { unitId: true },
          });
          if (rootDesignation || unit.parentId === null) {
            throw new UnitManagementError("A RootUnit cannot be deleted.");
          }
          if (await tx.unit.count({ where: { parentId: unitId } }) > 0) {
            throw new UnitManagementError("A Unit with children cannot be deleted.");
          }
          if (await tx.unitMembership.count({ where: { unitId } }) > 0) {
            throw new UnitManagementError("The Unit cannot be deleted because Player membership history exists.");
          }
          if (await tx.eventParticipation.count({ where: { unitId } }) > 0) {
            throw new UnitManagementError("The Unit cannot be deleted because Event participation history exists.");
          }

          const memberships = await tx.authorizedUserMembership.findMany({
            where: { unitId },
            select: {
              id: true,
              userId: true,
              authorityLevel: true,
              endedAt: true,
              grants: { select: { id: true } },
            },
          });
          if (
            memberships.length !== 1 ||
            memberships[0].userId !== unit.commanderUserId ||
            memberships[0].authorityLevel !== 0 ||
            memberships[0].endedAt !== null
          ) {
            throw new UnitManagementError("The Unit cannot be deleted because additional or historical authorized-user membership exists.");
          }
          if (memberships[0].grants.length > 0) {
            throw new UnitManagementError("The Unit cannot be deleted because permission grant or delegation history exists.");
          }

          await tx.authorizedUserMembership.delete({ where: { id: memberships[0].id } });
          return tx.unit.delete({ where: { id: unitId } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isKnownError(error, "P2003") || isKnownError(error, "P2034")) {
          throw new UnitManagementError("The Unit changed or gained protected dependencies; reload and try again.");
        }
        throw error;
      }
    },
  };
}

export const {
  updateUnitProfile,
  addAuthorizedUser,
  updateAuthorizedUserLevel,
  endAuthorizedUserMembership,
  grantPermission,
  revokePermissionGrant,
  createChildUnit,
  moveUnit,
  deleteUnit,
} = unitWorkflows();
