import "server-only";

import type { EventAuthorizedUser } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function canManageEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  if (userId.trim() === "" || eventId.trim() === "") return false;

  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { ownerUserId: true },
    }),
  ]);
  if (user === null || event === null) return false;
  if (event.ownerUserId === userId) return true;

  const authorization = await prisma.eventAuthorizedUser.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true },
  });
  return authorization !== null;
}

export async function canManageEventAuthorizedUsers(
  userId: string,
  eventId: string,
): Promise<boolean> {
  if (userId.trim() === "" || eventId.trim() === "") return false;

  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { ownerUserId: true },
    }),
  ]);

  return user !== null && event?.ownerUserId === userId;
}

export async function authorizeEventUser(
  ownerUserId: string,
  eventId: string,
  userId: string,
): Promise<EventAuthorizedUser> {
  if (!(await canManageEventAuthorizedUsers(ownerUserId, eventId))) {
    throw new Error("Unauthorized: only the Event owner may add managers.");
  }
  if (userId.trim() === "") {
    throw new Error("An authorized User is required.");
  }
  if (userId === ownerUserId) {
    throw new Error("The Event owner is already authorized through ownership.");
  }

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.eventAuthorizedUser.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    }),
  ]);
  if (user === null) throw new Error("User not found.");
  if (existing !== null) throw new Error("User is already authorized for this Event.");

  return prisma.eventAuthorizedUser.create({
    data: { eventId, userId, addedByUserId: ownerUserId },
  });
}

export async function revokeEventUser(
  ownerUserId: string,
  eventId: string,
  userId: string,
): Promise<EventAuthorizedUser> {
  if (!(await canManageEventAuthorizedUsers(ownerUserId, eventId))) {
    throw new Error("Unauthorized: only the Event owner may revoke managers.");
  }

  const authorization = await prisma.eventAuthorizedUser.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true },
  });
  if (authorization === null) {
    throw new Error("Event manager authorization not found.");
  }

  return prisma.eventAuthorizedUser.delete({
    where: { eventId_userId: { eventId, userId } },
  });
}