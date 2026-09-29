import "server-only";

import { Prisma, type EventResultValue } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { canManageEvent } from "./authorization";

export class EventResultError extends Error {}

export type PublicEventResult = {
  id: string;
  value: EventResultValue;
  status: "EFFECTIVE" | "PENDING" | "SUPERSEDED" | "REJECTED";
  proposedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  supersedesId: string | null;
  createdAt: Date;
};

export type EventResultState = {
  effective: PublicEventResult | null;
  pending: PublicEventResult | null;
};

function requiredId(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") throw new EventResultError(`${label} is required.`);
  return normalized;
}

function resultValue(value: string): EventResultValue {
  if (value === "ATTACKER_WIN" || value === "DEFENDER_WIN" || value === "DRAW") return value;
  throw new EventResultError("Event result must be ATTACKER_WIN, DEFENDER_WIN, or DRAW.");
}

function resultSelect() {
  return {
    id: true,
    value: true,
    status: true,
    proposedByUserId: true,
    reviewedByUserId: true,
    reviewedAt: true,
    supersedesId: true,
    createdAt: true,
  } as const;
}

function publicResult(result: {
  id: string;
  value: EventResultValue;
  status: "EFFECTIVE" | "PENDING" | "SUPERSEDED" | "REJECTED";
  proposedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  supersedesId: string | null;
  createdAt: Date;
} | null): PublicEventResult | null {
  if (result === null) return null;
  return result;
}

async function assertManager(userId: string, eventId: string) {
  if (userId.trim() === "" || !(await canManageEvent(userId, eventId))) {
    throw new EventResultError("Unauthorized: user cannot manage this Event result.");
  }
}

async function eventForResult(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, scheduledAt: true },
  });
  if (event === null) throw new EventResultError("Event not found.");
  return event;
}

export async function getEventResultState(eventId: string): Promise<EventResultState> {
  const normalizedEventId = requiredId(eventId, "Event");
  const results = await prisma.eventResult.findMany({
    where: { eventId: normalizedEventId, status: { in: ["EFFECTIVE", "PENDING"] } },
    orderBy: { createdAt: "desc" },
    select: resultSelect(),
  });
  return {
    effective: publicResult(results.find((result) => result.status === "EFFECTIVE") ?? null),
    pending: publicResult(results.find((result) => result.status === "PENDING") ?? null),
  };
}

export async function setInitialEventResult(
  userId: string,
  eventId: string,
  value: string,
): Promise<PublicEventResult> {
  const normalizedEventId = requiredId(eventId, "Event");
  const normalizedValue = resultValue(value);
  await assertManager(userId, normalizedEventId);
  const event = await eventForResult(normalizedEventId);
  if (event.scheduledAt.getTime() > Date.now()) {
    throw new EventResultError("An Event result can only be recorded after the scheduled Event time.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.eventResult.findFirst({
        where: { eventId: normalizedEventId, status: "EFFECTIVE" },
        select: { id: true },
      });
      if (existing !== null) throw new EventResultError("This Event already has an effective result.");
      return transaction.eventResult.create({
        data: {
          eventId: normalizedEventId,
          value: normalizedValue,
          status: "EFFECTIVE",
          proposedByUserId: userId,
        },
        select: resultSelect(),
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return result;
  } catch (error) {
    if (error instanceof EventResultError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new EventResultError("This Event already has an effective result.");
    }
    throw error;
  }
}

export async function proposeEventResultCorrection(
  userId: string,
  eventId: string,
  value: string,
): Promise<PublicEventResult> {
  const normalizedEventId = requiredId(eventId, "Event");
  const normalizedValue = resultValue(value);
  await assertManager(userId, normalizedEventId);
  await eventForResult(normalizedEventId);

  return prisma.$transaction(async (transaction) => {
    const effective = await transaction.eventResult.findFirst({
      where: { eventId: normalizedEventId, status: "EFFECTIVE" },
      select: { id: true, value: true },
    });
    if (effective === null) throw new EventResultError("An effective Event result is required before proposing a correction.");
    if (effective.value === normalizedValue) throw new EventResultError("The correction must differ from the current effective result.");
    const pending = await transaction.eventResult.findFirst({
      where: { eventId: normalizedEventId, status: "PENDING" },
      select: { id: true },
    });
    if (pending !== null) throw new EventResultError("A correction is already awaiting approval.");
    return transaction.eventResult.create({
      data: {
        eventId: normalizedEventId,
        value: normalizedValue,
        status: "PENDING",
        proposedByUserId: userId,
        supersedesId: effective.id,
      },
      select: resultSelect(),
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewEventResultCorrection(
  userId: string,
  eventId: string,
  resultId: string,
  decision: "APPROVE" | "REJECT",
): Promise<PublicEventResult> {
  const normalizedEventId = requiredId(eventId, "Event");
  const normalizedResultId = requiredId(resultId, "Correction");
  await assertManager(userId, normalizedEventId);

  return prisma.$transaction(async (transaction) => {
    const proposal = await transaction.eventResult.findUnique({
      where: { id: normalizedResultId },
      select: { id: true, eventId: true, status: true, proposedByUserId: true, supersedesId: true },
    });
    if (proposal === null || proposal.eventId !== normalizedEventId) throw new EventResultError("Correction proposal not found.");
    if (proposal.status !== "PENDING") throw new EventResultError("Correction proposal is no longer pending.");
    if (proposal.proposedByUserId === userId) throw new EventResultError("The proposer cannot review their own correction.");

    if (decision === "REJECT") {
      return transaction.eventResult.update({
        where: { id: proposal.id },
        data: { status: "REJECTED", reviewedByUserId: userId, reviewedAt: new Date() },
        select: resultSelect(),
      });
    }

    const effective = await transaction.eventResult.findFirst({
      where: { eventId: normalizedEventId, status: "EFFECTIVE" },
      select: { id: true },
    });
    if (effective === null || proposal.supersedesId !== effective.id) {
      throw new EventResultError("The correction is stale because the effective result changed.");
    }
    await transaction.eventResult.update({
      where: { id: effective.id },
      data: { status: "SUPERSEDED" },
    });
    return transaction.eventResult.update({
      where: { id: proposal.id },
      data: { status: "EFFECTIVE", reviewedByUserId: userId, reviewedAt: new Date() },
      select: resultSelect(),
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
