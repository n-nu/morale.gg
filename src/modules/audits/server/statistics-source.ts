import "server-only";

import { Prisma, type AuditUnitType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type EffectiveFinalizedAuditObservation = {
  auditId: string;
  atomicEventUnitId: string;
  eventId: string;
  eventParticipationId: string;
  representedUnitId: string;
  isMandatory: boolean;
  unitType: AuditUnitType | null;
  unitResults: {
    tickets: number | null;
    flagCaptures: number | null;
    flagLosses: number | null;
    stars: number | null;
  };
  playerResults: Array<{
    gamePlayerId: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  roles: Array<{ gamePlayerId: string; role: "COMMANDER" | "FLAG_BEARER" }>;
  commanderGamePlayerId: string | null;
};

export type EffectiveFinalizedAuditRankerAggregate = {
  gamePlayerId: string;
  unitType: AuditUnitType;
  kills: number;
  deaths: number;
  assists: number;
  auditAppearances: number;
  distinctEvents: number;
};

export type CommandGroupDescendants = {
  groupId: string;
  eventId: string;
  parentGroupId: string | null;
  representedUnitId: string;
  commanderGamePlayerId: string;
  descendantAtomicEventUnitIds: string[];
};

export type EffectiveFinalizedAuditSource = {
  observations: EffectiveFinalizedAuditObservation[];
  rankerAggregates: EffectiveFinalizedAuditRankerAggregate[];
  commandGroupDescendants: CommandGroupDescendants[];
};

type RankerAggregateRow = {
  gamePlayerId: string;
  unitType: AuditUnitType;
  kills: bigint;
  deaths: bigint;
  assists: bigint;
  auditAppearances: bigint;
  distinctEvents: bigint;
};

function normalizedIds(eventIds: readonly string[]): string[] {
  return [...new Set(eventIds.map((eventId) => eventId.trim()).filter(Boolean))];
}

function getCommandGroupDescendants(
  groups: Array<{
    id: string;
    eventId: string;
    parentGroupId: string | null;
    eventParticipation: { unitId: string } | null;
    commanderPlayer: { playerId: string };
    atomicUnitMemberships: Array<{ atomicEventUnitId: string }>;
  }>,
): CommandGroupDescendants[] {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const childrenByParent = new Map<string, string[]>();
  for (const group of groups) {
    if (group.parentGroupId === null) continue;
    const children = childrenByParent.get(group.parentGroupId) ?? [];
    children.push(group.id);
    childrenByParent.set(group.parentGroupId, children);
  }

  const collectAtomicUnitIds = (groupId: string, path: Set<string>): string[] => {
    if (path.has(groupId)) return [];
    const group = groupsById.get(groupId);
    if (group === undefined) return [];

    const nextPath = new Set(path).add(groupId);
    const atomicUnitIds = new Set(group.atomicUnitMemberships.map(({ atomicEventUnitId }) => atomicEventUnitId));
    for (const childId of childrenByParent.get(groupId) ?? []) {
      for (const atomicUnitId of collectAtomicUnitIds(childId, nextPath)) atomicUnitIds.add(atomicUnitId);
    }
    return [...atomicUnitIds].sort();
  };

  return groups.map((group) => ({
    groupId: group.id,
    eventId: group.eventId,
    parentGroupId: group.parentGroupId,
    representedUnitId: group.eventParticipation?.unitId ?? "",
    commanderGamePlayerId: group.commanderPlayer.playerId,
    descendantAtomicEventUnitIds: collectAtomicUnitIds(group.id, new Set()),
  }));
}

export async function getEffectiveFinalizedAuditObservations(
  eventIds: readonly string[],
): Promise<EffectiveFinalizedAuditSource> {
  const selectedEventIds = normalizedIds(eventIds);
  if (selectedEventIds.length === 0) {
    return { observations: [], rankerAggregates: [], commandGroupDescendants: [] };
  }

  const [audits, groups, rankerRows] = await Promise.all([
    prisma.audit.findMany({
      where: {
        lifecycle: "FINAL",
        atomicEventUnit: { eventParticipation: { eventId: { in: selectedEventIds } } },
      },
      select: {
        id: true,
        atomicEventUnitId: true,
        unitType: true,
        tickets: true,
        flagCaptures: true,
        flagLosses: true,
        stars: true,
        atomicEventUnit: {
          select: {
            id: true,
            isMandatory: true,
            eventParticipation: { select: { id: true, eventId: true, unitId: true } },
          },
        },
        playerResults: {
          select: {
            kills: true,
            deaths: true,
            assists: true,
            player: { select: { playerId: true } },
          },
        },
        roles: {
          select: { role: true, player: { select: { playerId: true } } },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.eventCommandGroup.findMany({
      where: { eventId: { in: selectedEventIds } },
      select: {
        id: true,
        eventId: true,
        parentGroupId: true,
        eventParticipation: { select: { unitId: true } },
        commanderPlayer: { select: { playerId: true } },
        atomicUnitMemberships: { select: { atomicEventUnitId: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.$queryRaw<RankerAggregateRow[]>(Prisma.sql`
      WITH type_totals AS (
        SELECT
          player."playerId" AS "gamePlayerId",
          audit."unitType" AS "unitType",
          SUM(result."kills") AS "kills",
          SUM(result."deaths") AS "deaths",
          SUM(result."assists") AS "assists",
          COUNT(*) AS "auditAppearances"
        FROM "Audit" AS audit
        JOIN "AtomicEventUnit" AS atomic_unit
          ON atomic_unit."id" = audit."atomicEventUnitId"
        JOIN "EventParticipation" AS participation
          ON participation."id" = atomic_unit."eventParticipationId"
        JOIN "AuditPlayerResult" AS result
          ON result."auditId" = audit."id"
        JOIN "Player" AS player
          ON player."id" = result."playerId"
        WHERE audit."lifecycle" = 'FINAL'::"AuditLifecycle"
          AND audit."unitType" IS NOT NULL
          AND participation."eventId" IN (${Prisma.join(selectedEventIds)})
        GROUP BY player."playerId", audit."unitType"
      ), event_totals AS (
        SELECT
          player."playerId" AS "gamePlayerId",
          COUNT(DISTINCT participation."eventId") AS "distinctEvents"
        FROM "Audit" AS audit
        JOIN "AtomicEventUnit" AS atomic_unit
          ON atomic_unit."id" = audit."atomicEventUnitId"
        JOIN "EventParticipation" AS participation
          ON participation."id" = atomic_unit."eventParticipationId"
        JOIN "AuditPlayerResult" AS result
          ON result."auditId" = audit."id"
        JOIN "Player" AS player
          ON player."id" = result."playerId"
        WHERE audit."lifecycle" = 'FINAL'::"AuditLifecycle"
          AND audit."unitType" IS NOT NULL
          AND participation."eventId" IN (${Prisma.join(selectedEventIds)})
        GROUP BY player."playerId"
      )
      SELECT
        type_totals."gamePlayerId",
        type_totals."unitType",
        type_totals."kills",
        type_totals."deaths",
        type_totals."assists",
        type_totals."auditAppearances",
        event_totals."distinctEvents"
      FROM type_totals
      JOIN event_totals USING ("gamePlayerId")
      ORDER BY type_totals."gamePlayerId", type_totals."unitType"
    `),
  ]);

  return {
    observations: audits.map((audit) => {
      const roles = audit.roles.map(({ player, role }) => ({ gamePlayerId: player.playerId, role }));
      return {
        auditId: audit.id,
        atomicEventUnitId: audit.atomicEventUnitId,
        eventId: audit.atomicEventUnit.eventParticipation.eventId,
        eventParticipationId: audit.atomicEventUnit.eventParticipation.id,
        representedUnitId: audit.atomicEventUnit.eventParticipation.unitId,
        isMandatory: audit.atomicEventUnit.isMandatory,
        unitType: audit.unitType,
        unitResults: {
          tickets: audit.tickets,
          flagCaptures: audit.flagCaptures,
          flagLosses: audit.flagLosses,
          stars: audit.stars,
        },
        playerResults: audit.playerResults.map(({ player, kills, deaths, assists }) => ({
          gamePlayerId: player.playerId,
          kills,
          deaths,
          assists,
        })),
        roles,
        commanderGamePlayerId: roles.find(({ role }) => role === "COMMANDER")?.gamePlayerId ?? null,
      };
    }),
    rankerAggregates: rankerRows.map((row) => ({
      gamePlayerId: row.gamePlayerId,
      unitType: row.unitType,
      kills: Number(row.kills),
      deaths: Number(row.deaths),
      assists: Number(row.assists),
      auditAppearances: Number(row.auditAppearances),
      distinctEvents: Number(row.distinctEvents),
    })),
    commandGroupDescendants: getCommandGroupDescendants(groups),
  };
}
