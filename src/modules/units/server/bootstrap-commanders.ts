import { isWebsiteAdmin, getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";

export type CommanderMapping = Record<string, string>;

export async function bootstrapCommanders(mapping: CommanderMapping): Promise<number> {
  const actingUserId = await getAuthenticatedUserId();
  if (!actingUserId || !isWebsiteAdmin({ id: actingUserId })) {
    throw new Error("Only a website administrator can bootstrap Commanders");
  }

  const entries = Object.entries(mapping);
  if (entries.length === 0 || new Set(entries.map(([unitId]) => unitId)).size !== entries.length) {
    throw new Error("Commander mapping must contain at least one unique Unit");
  }

  return prisma.$transaction(async (transaction) => {
    const userIds = [...new Set(entries.map(([, userId]) => userId))];
    const units = await transaction.unit.findMany({
      where: { id: { in: entries.map(([unitId]) => unitId) } },
      select: { id: true },
    });
    const users = await transaction.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    if (units.length !== entries.length) {
      throw new Error("Commander mapping references a missing Unit");
    }
    if (users.length !== userIds.length) {
      throw new Error("Commander mapping references a missing Auth.js User");
    }

    for (const [unitId, userId] of entries) {
      const levelZeroMemberships = await transaction.authorizedUserMembership.findMany({
        where: { unitId, authorityLevel: 0 },
        select: { id: true, userId: true },
      });

      if (levelZeroMemberships.length > 1) {
        throw new Error(`Unit ${unitId} has conflicting level-0 memberships`);
      }
      if (levelZeroMemberships[0] && levelZeroMemberships[0].userId !== userId) {
        throw new Error(`Unit ${unitId} has a conflicting level-0 Commander`);
      }

      const membership = await transaction.authorizedUserMembership.findUnique({
        where: { userId_unitId: { userId, unitId } },
        select: { id: true, authorityLevel: true },
      });

      if (membership) {
        if (membership.authorityLevel !== 0) {
          await transaction.authorizedUserMembership.update({
            where: { id: membership.id },
            data: { authorityLevel: 0 },
          });
        }
      } else {
        await transaction.authorizedUserMembership.create({
          data: {
            userId,
            unitId,
            authorityLevel: 0,
            createdByUserId: actingUserId,
          },
        });
      }

      await transaction.unit.update({
        where: { id: unitId },
        data: { commanderUserId: userId },
      });
    }

    return entries.length;
  });
}
