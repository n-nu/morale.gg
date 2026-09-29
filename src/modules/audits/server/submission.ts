import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canSubmitAudit as checkCanSubmitAudit } from "@/modules/units/server/authorization";
import { resolveOrCreatePlayerByGameId } from "@/modules/players/server/audit-resolution";

export class AuditSubmissionError extends Error {}

export type AuditRow = {
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
};

export type AuditRoleInput = {
  playerId: string;
  role: "COMMANDER" | "FLAG_BEARER";
};

export type AuditSubmissionInput = {
  rawData: string;
  unitType: "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY";
  tickets: number;
  flagCaptures: number;
  flagLosses: number;
  stars: number;
  roles: AuditRoleInput[];
};

export type AuditDraftInput = {
  userId: string;
  atomicEventUnitId: string;
  canSubmitAudit?: (userId: string, unitId: string) => Promise<boolean>;
};

type AuditTransaction = {
  audit: typeof prisma.audit;
  auditPlayerResult: typeof prisma.auditPlayerResult;
  auditRoleAssignment: typeof prisma.auditRoleAssignment;
  atomicEventUnit?: typeof prisma.atomicEventUnit;
};

export type AuditFinalizationInput = {
  userId: string;
  auditId: string;
  submission: AuditSubmissionInput;
  canSubmitAudit?: (userId: string, unitId: string) => Promise<boolean>;
  resolvePlayerByGameId?: (playerId: string) => Promise<{ id: string; playerId: string }>;
  transaction?: <T>(callback: (tx: AuditTransaction) => Promise<T>) => Promise<T>;
};

function normalizePlayerId(value: unknown, label = "PlayerID"): string {
  if (typeof value !== "string") throw new AuditSubmissionError(`${label} is required.`);
  const trimmed = value.trim();
  if (trimmed === "") throw new AuditSubmissionError(`${label} is required.`);
  if (/\s/u.test(trimmed)) {
    throw new AuditSubmissionError(`${label} cannot contain whitespace.`);
  }
  return trimmed;
}

function normalizeInteger(value: unknown, label: string): number {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0) {
    throw new AuditSubmissionError(`${label} must be a valid numeric non-negative integer.`);
  }
  return numeric;
}

function normalizeRole(role: unknown): "COMMANDER" | "FLAG_BEARER" {
  if (role === "COMMANDER" || role === "FLAG_BEARER") return role;
  throw new AuditSubmissionError("Role must be COMMANDER or FLAG_BEARER.");
}

export function parseAuditRows(rawData: string): AuditRow[] {
  const data = typeof rawData === "string" ? rawData.trim() : "";
  if (data === "") {
    throw new AuditSubmissionError("Audit raw data is required.");
  }

  const rows = data.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (rows.length === 0) {
    throw new AuditSubmissionError("Audit raw data is required.");
  }

  const seen = new Set<string>();
  return rows.map((line, index) => {
    const parts = line.split(",");
    if (parts.length !== 4) {
      throw new AuditSubmissionError(`Malformed audit row at line ${index + 1}: expected playerId,kills,deaths,assists.`);
    }

    const [playerIdRaw, killsRaw, deathsRaw, assistsRaw] = parts;
    const playerId = normalizePlayerId(playerIdRaw, "PlayerID");
    if (seen.has(playerId)) {
      throw new AuditSubmissionError(`Duplicate PlayerID '${playerId}' in one Audit.`);
    }
    seen.add(playerId);

    const killsRawText = killsRaw.trim();
    const deathsRawText = deathsRaw.trim();
    const assistsRawText = assistsRaw.trim();
    if (killsRawText === "" || deathsRawText === "" || assistsRawText === "") {
      throw new AuditSubmissionError("Audit numeric values must be valid non-negative integers.");
    }
    const kills = normalizeInteger(killsRawText, "Kills");
    const deaths = normalizeInteger(deathsRawText, "Deaths");
    const assists = normalizeInteger(assistsRawText, "Assists");

    return { playerId, kills, deaths, assists };
  });
}

export async function createAuditDraftForAtomicUnit(
  input: AuditDraftInput,
): Promise<{ id: string; lifecycle: "DRAFT" }> {
  const userId = normalizePlayerId(input.userId, "User");
  const atomicEventUnitId = input.atomicEventUnitId.trim();
  if (atomicEventUnitId === "") throw new AuditSubmissionError("Atomic Event-unit is required.");

  const atomicUnit = await prisma.atomicEventUnit.findUnique({
    where: { id: atomicEventUnitId },
    select: {
      id: true,
      eventParticipationId: true,
      eventParticipation: { select: { unitId: true, status: true } },
    },
  });
  if (atomicUnit === null) {
    throw new AuditSubmissionError("Atomic Event-unit not found.");
  }
  if (atomicUnit.eventParticipation.status !== "APPROVED") {
    throw new AuditSubmissionError("Only approved Event participations can create an Audit draft.");
  }

  const canSubmitAudit = input.canSubmitAudit ?? checkCanSubmitAudit;
  if (!(await canSubmitAudit(userId, atomicUnit.eventParticipation.unitId))) {
    throw new AuditSubmissionError("Unauthorized: user cannot submit an Audit for this Unit.");
  }

  const existingAudit = await prisma.audit.findUnique({
    where: { atomicEventUnitId },
    select: { id: true },
  });
  if (existingAudit !== null) {
    throw new AuditSubmissionError("One Audit maximum exists per atomic Event-unit.");
  }

  try {
    const draft = await prisma.audit.create({
      data: {
        atomicEventUnitId,
        createdByUserId: userId,
        lifecycle: "DRAFT",
      },
      select: { id: true, lifecycle: true },
    });
    return { id: draft.id, lifecycle: "DRAFT" as const };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuditSubmissionError("One Audit maximum exists per atomic Event-unit.");
    }
    throw error;
  }
}

function validateFinalSubmission(
  submission: AuditSubmissionInput,
  rows: AuditRow[],
): { playerIds: Set<string>; roleAssignments: AuditRoleInput[] } {
  if (typeof submission !== "object" || submission === null) {
    throw new AuditSubmissionError("Audit submission payload is required.");
  }

  const unitType = submission.unitType?.toUpperCase();
  if (!unitType || !["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"].includes(unitType)) {
    throw new AuditSubmissionError("Audit Unit type is required and must be one of REGULAR, RIFLES, CAVALRY, or ARTILLERY.");
  }

  const stats = [
    [submission.tickets, "Tickets"],
    [submission.flagCaptures, "Flag Captures"],
    [submission.flagLosses, "Flag Losses"],
    [submission.stars, "Stars"],
  ] as const;
  for (const [value, label] of stats) {
    normalizeInteger(value, label);
  }

  const playerIds = new Set(rows.map((row) => row.playerId));
  const normalizedRoles = (submission.roles ?? []).map((roleInput) => ({
    playerId: normalizePlayerId(roleInput?.playerId, "Role PlayerID"),
    role: normalizeRole(roleInput?.role),
  }));

  const roleAssignments = normalizedRoles;
  const commandAssignments = roleAssignments.filter((entry) => entry.role === "COMMANDER");
  const flagAssignments = roleAssignments.filter((entry) => entry.role === "FLAG_BEARER");

  if (commandAssignments.length !== 1) {
    throw new AuditSubmissionError("Each Audit requires exactly one Commander.");
  }
  if (unitType === "REGULAR" && flagAssignments.length !== 1) {
    throw new AuditSubmissionError("Regular Audits require exactly one Flag Bearer.");
  }
  if (unitType !== "REGULAR" && flagAssignments.length > 0) {
    throw new AuditSubmissionError("Only Regular Audits may include a Flag Bearer.");
  }

  const rolePlayerIds = new Set(roleAssignments.map((entry) => entry.playerId));
  for (const playerId of rolePlayerIds) {
    if (!playerIds.has(playerId)) {
      throw new AuditSubmissionError("Roles must reference Players present in the Audit.");
    }
  }

  const uniquePairs = new Set<string>();
  for (const roleInput of roleAssignments) {
    const key = `${roleInput.playerId}:${roleInput.role}`;
    if (uniquePairs.has(key)) {
      throw new AuditSubmissionError("Duplicate role assignments are not allowed.");
    }
    uniquePairs.add(key);
  }

  if (unitType === "REGULAR") {
    const commanderId = commandAssignments[0]?.playerId;
    const flagBearerId = flagAssignments[0]?.playerId;
    if (commanderId === flagBearerId) {
      // allowed by product requirement.
    }
  }

  return { playerIds, roleAssignments };
}

export async function submitAudit(
  input: AuditFinalizationInput,
): Promise<{ id: string; lifecycle: "FINAL"; unitType: string; tickets: number }> {
  const userId = normalizePlayerId(input.userId, "User");
  const auditId = input.auditId.trim();
  if (auditId === "") throw new AuditSubmissionError("Audit ID is required.");

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      atomicEventUnit: {
        select: {
          auditUnitType: true,
          eventParticipation: {
            select: { unitId: true, status: true },
          },
        },
      },
    },
  });

  if (audit === null) {
    throw new AuditSubmissionError("Audit not found.");
  }
  if (!audit.atomicEventUnit?.eventParticipation) {
    throw new AuditSubmissionError("Audit unit context is unavailable.");
  }
  if (audit.lifecycle === "FINAL") {
    throw new AuditSubmissionError("Finalized Audits are immutable and cannot be edited.");
  }
  if (audit.createdByUserId !== userId) {
    throw new AuditSubmissionError("Only the creator may edit an existing draft.");
  }

  const unitId = audit.atomicEventUnit.eventParticipation.unitId;
  const canSubmitAudit = input.canSubmitAudit ?? checkCanSubmitAudit;
  if (!(await canSubmitAudit(userId, unitId))) {
    throw new AuditSubmissionError("Unauthorized: user cannot submit an Audit for this Unit.");
  }

  const rows = parseAuditRows(input.submission.rawData);
  const { roleAssignments } = validateFinalSubmission(input.submission, rows);
  if (audit.atomicEventUnit.auditUnitType != null && audit.atomicEventUnit.auditUnitType !== input.submission.unitType.toUpperCase()) {
    throw new AuditSubmissionError("Audit Unit type must match the Event battlefield configuration.");
  }

  const resolvePlayerByGameId = input.resolvePlayerByGameId ?? resolveOrCreatePlayerByGameId;
  const resolvedPlayers = await Promise.all(
    rows.map(async (row) => ({
      row,
      player: await resolvePlayerByGameId(row.playerId),
    })),
  );

  const playerMap = new Map(resolvedPlayers.map(({ row, player }) => [row.playerId, player]));
  for (const role of roleAssignments) {
    if (!playerMap.has(role.playerId)) {
      throw new AuditSubmissionError("Roles must reference Players present in the Audit.");
    }
  }

  const transaction: NonNullable<AuditFinalizationInput["transaction"]> = input.transaction ?? (async <T>(callback: (tx: AuditTransaction) => Promise<T>) =>
    prisma.$transaction(callback as never) as Promise<T>);

  return transaction(async (tx: AuditTransaction) => {
    const currentAudit = await tx.audit.findUnique({
      where: { id: auditId },
      select: { id: true, lifecycle: true },
    });
    if (currentAudit === null || currentAudit.lifecycle === "FINAL") {
      throw new AuditSubmissionError("Finalized Audits are immutable and cannot be edited.");
    }

    const results = rows.map((row) => ({
      auditId,
      playerId: playerMap.get(row.playerId)!.id,
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
    }));

    const roleData = roleAssignments.map((role) => ({
      auditId,
      playerId: playerMap.get(role.playerId)!.id,
      role: role.role,
    }));

    await tx.auditPlayerResult.createMany({ data: results });
    await tx.auditRoleAssignment.createMany({ data: roleData });

    const finalAudit = await tx.audit.update({
      where: { id: auditId },
      data: {
        lifecycle: "FINAL",
        rawData: input.submission.rawData,
        unitType: input.submission.unitType.toUpperCase() as "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY",
        tickets: input.submission.tickets,
        flagCaptures: input.submission.flagCaptures,
        flagLosses: input.submission.flagLosses,
        stars: input.submission.stars,
        submittedAt: new Date(),
      },
      select: { id: true, lifecycle: true, unitType: true, tickets: true },
    });
    if (tx.atomicEventUnit !== undefined) {
      await tx.atomicEventUnit.update({
        where: { id: audit.atomicEventUnitId },
        data: { auditUnitType: finalAudit.unitType },
      });
    }

    return {
      id: finalAudit.id,
      lifecycle: finalAudit.lifecycle as "FINAL",
      unitType: finalAudit.unitType as string,
      tickets: Number(finalAudit.tickets ?? 0),
    };
  });
}

export const finalizeAudit = submitAudit;
