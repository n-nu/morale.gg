import "server-only";

import type { AuditUnitType, BattlefieldSide } from "@prisma/client";

import {
  getEffectiveFinalizedAuditObservations,
  type CommandGroupDescendants,
  type EffectiveFinalizedAuditObservation,
} from "@/modules/audits/server/statistics-source";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";

import { buildCommanderPlayerStatistics, type CommanderUnitStatistics } from "./commander";
import { buildGeneralPlayerStatistics, type GeneralPlayerStatistics } from "./general";
import { deriveRatio, type RatioMetric } from "./ratios";
import { buildRankerPlayerStatistics, type RankerUnitTypeStatistics } from "./ranker";
import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
  type StatisticsWindow,
} from "./windows";

export const PLAYER_PROFILE_HISTORY_PAGE_SIZE = 50;

export type PlayerProfileHistoryPage<Row> = {
  rows: Row[];
  page: number;
  pageSize: number;
  totalRows: number;
  pageCount: number;
};

export type PlayerProfileEventRow = {
  auditId: string;
  eventId: string;
  occurredAt: Date;
  unitId: string;
  unitName: string;
  unitType: AuditUnitType;
  kills: number;
  deaths: number;
  assists: number;
  killDeathRatio: RatioMetric;
  killAssistDeathRatio: RatioMetric;
};

export type CommanderProfileEventRow = {
  auditId: string;
  eventId: string;
  occurredAt: Date;
  unitId: string;
  unitName: string;
  unitType: AuditUnitType;
  players: number;
  kills: number;
  deaths: number;
  assists: number;
  tickets: number;
  flagCaptures: number;
  flagLosses: number;
  stars: number;
  killDeathRatio: RatioMetric;
};

export type GeneralProfileCommandRow = {
  groupId: string;
  eventId: string;
  occurredAt: Date;
  unitId: string;
  side: BattlefieldSide | null;
  companies: number;
  companiesByType: Record<AuditUnitType, number>;
};

export type PlayerProfileStatistics = {
  gamePlayerId: string;
  window: StatisticsWindow;
  unitType: AuditUnitType | null;
  playerSummary: RankerUnitTypeStatistics[];
  playerHistory: PlayerProfileHistoryPage<PlayerProfileEventRow>;
  commanderSummary: CommanderUnitStatistics[];
  commanderHistory: PlayerProfileHistoryPage<CommanderProfileEventRow>;
  generalSummary: GeneralPlayerStatistics | null;
  generalHistory: PlayerProfileHistoryPage<GeneralProfileCommandRow>;
};

export type GetPlayerProfileStatisticsOptions = {
  gamePlayerId: string;
  window?: StatisticsWindow;
  unitType?: AuditUnitType | null;
  playerPage?: number;
  commanderPage?: number;
  generalPage?: number;
  now?: Date;
};

function historyPage<Row>(rows: Row[], page: number): PlayerProfileHistoryPage<Row> {
  const pageSize = PLAYER_PROFILE_HISTORY_PAGE_SIZE;
  const pageCount = Math.ceil(rows.length / pageSize);
  const selectedPage = pageCount === 0
    ? 1
    : Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (selectedPage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page: selectedPage,
    pageSize,
    totalRows: rows.length,
    pageCount,
  };
}

function unitTypeMatches(unitType: AuditUnitType, selected: AuditUnitType | null): boolean {
  return selected === null || selected === unitType;
}

function compareRows<T extends { occurredAt: Date; eventId: string; unitId: string; auditId: string }>(
  left: T,
  right: T,
): number {
  return right.occurredAt.getTime() - left.occurredAt.getTime()
    || right.eventId.localeCompare(left.eventId)
    || left.unitId.localeCompare(right.unitId)
    || left.auditId.localeCompare(right.auditId);
}

function playerHistoryRows(
  observations: readonly EffectiveFinalizedAuditObservation[],
  eventTimes: ReadonlyMap<string, Date>,
  gamePlayerId: string,
  unitType: AuditUnitType | null,
): PlayerProfileEventRow[] {
  const rows: PlayerProfileEventRow[] = [];

  for (const observation of observations) {
    if (observation.unitType === null || !unitTypeMatches(observation.unitType, unitType)) continue;
    const result = observation.playerResults.find(({ gamePlayerId: id }) => id === gamePlayerId);
    const occurredAt = eventTimes.get(observation.eventId);
    if (result === undefined || occurredAt === undefined) continue;

    rows.push({
      auditId: observation.auditId,
      eventId: observation.eventId,
      occurredAt,
      unitId: observation.representedUnitId,
      unitName: observation.representedUnitName,
      unitType: observation.unitType,
      kills: result.kills,
      deaths: result.deaths,
      assists: result.assists,
      killDeathRatio: deriveRatio(result.kills, result.deaths, "K"),
      killAssistDeathRatio: deriveRatio(result.kills + result.assists, result.deaths, "K+A"),
    });
  }

  return rows.sort(compareRows);
}

function commanderHistoryRows(
  observations: readonly EffectiveFinalizedAuditObservation[],
  eventTimes: ReadonlyMap<string, Date>,
  gamePlayerId: string,
  unitType: AuditUnitType | null,
): CommanderProfileEventRow[] {
  const rows: CommanderProfileEventRow[] = [];

  for (const observation of observations) {
    if (
      observation.commanderGamePlayerId !== gamePlayerId
      || observation.unitType === null
      || !unitTypeMatches(observation.unitType, unitType)
    ) continue;
    const occurredAt = eventTimes.get(observation.eventId);
    if (occurredAt === undefined) continue;

    const totals = observation.playerResults.reduce(
      (sum, result) => ({
        kills: sum.kills + result.kills,
        deaths: sum.deaths + result.deaths,
        assists: sum.assists + result.assists,
      }),
      { kills: 0, deaths: 0, assists: 0 },
    );
    rows.push({
      auditId: observation.auditId,
      eventId: observation.eventId,
      occurredAt,
      unitId: observation.representedUnitId,
      unitName: observation.representedUnitName,
      unitType: observation.unitType,
      players: observation.playerResults.length,
      ...totals,
      tickets: observation.unitResults.tickets ?? 0,
      flagCaptures: observation.unitResults.flagCaptures ?? 0,
      flagLosses: observation.unitResults.flagLosses ?? 0,
      stars: observation.unitResults.stars ?? 0,
      killDeathRatio: deriveRatio(totals.kills, totals.deaths, "K"),
    });
  }

  return rows.sort(compareRows);
}

function generalHistoryRows(
  observations: readonly EffectiveFinalizedAuditObservation[],
  commandGroups: readonly CommandGroupDescendants[],
  eventTimes: ReadonlyMap<string, Date>,
  gamePlayerId: string,
): GeneralProfileCommandRow[] {
  const observationsByAtomicId = new Map(observations.map((observation) => [observation.atomicEventUnitId, observation]));
  const rows: GeneralProfileCommandRow[] = [];

  for (const group of commandGroups) {
    if (group.commanderGamePlayerId !== gamePlayerId || group.descendantAtomicEventUnitIds.length < 2) continue;
    const occurredAt = eventTimes.get(group.eventId);
    if (occurredAt === undefined) continue;
    const descendants = group.descendantAtomicEventUnitIds.map((id) => observationsByAtomicId.get(id));
    const sides = new Set(descendants.map((observation) => observation?.side).filter((side): side is BattlefieldSide => side !== null && side !== undefined));
    const companiesByType: Record<AuditUnitType, number> = {
      REGULAR: 0,
      RIFLES: 0,
      CAVALRY: 0,
      ARTILLERY: 0,
    };
    for (const observation of descendants) {
      if (observation?.unitType !== null && observation?.unitType !== undefined) {
        companiesByType[observation.unitType] += 1;
      }
    }

    rows.push({
      groupId: group.groupId,
      eventId: group.eventId,
      occurredAt,
      unitId: group.representedUnitId,
      side: sides.size === 1 && descendants.every((observation) => observation?.side !== null && observation?.side !== undefined)
        ? [...sides][0]
        : null,
      companies: group.descendantAtomicEventUnitIds.length,
      companiesByType,
    });
  }

  return rows.sort((left, right) =>
    right.occurredAt.getTime() - left.occurredAt.getTime()
    || right.eventId.localeCompare(left.eventId)
    || left.unitId.localeCompare(right.unitId)
    || left.groupId.localeCompare(right.groupId),
  );
}

export async function getPlayerProfileStatistics({
  gamePlayerId,
  window = DEFAULT_STATISTICS_WINDOW,
  unitType = null,
  playerPage = 1,
  commanderPage = 1,
  generalPage = 1,
  now = new Date(),
}: GetPlayerProfileStatisticsOptions): Promise<PlayerProfileStatistics> {
  const normalizedPlayerId = gamePlayerId.trim();
  if (normalizedPlayerId === "") {
    return {
      gamePlayerId: normalizedPlayerId,
      window,
      unitType,
      playerSummary: [],
      playerHistory: historyPage([], playerPage),
      commanderSummary: [],
      commanderHistory: historyPage([], commanderPage),
      generalSummary: null,
      generalHistory: historyPage([], generalPage),
    };
  }

  const range = getStatisticsWindowRange(window, now);
  const selectedEventTimes = (await getCanonicalEventTimes())
    .filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range));
  const selectedEventIds = selectedEventTimes.map(({ eventId }) => eventId);
  const eventTimeById = new Map(selectedEventTimes.map(({ eventId, occurredAt }) => [eventId, occurredAt]));
  const source = await getEffectiveFinalizedAuditObservations(selectedEventIds);

  const playerSummary = buildRankerPlayerStatistics(source.rankerAggregates)
    .find(({ gamePlayerId: id }) => id === normalizedPlayerId)
    ?.unitTypes.filter(({ unitType: type }) => unitTypeMatches(type, unitType)) ?? [];
  const commanderSummary = buildCommanderPlayerStatistics(source.observations)
    .find(({ gamePlayerId: id }) => id === normalizedPlayerId)
    ?.unitTypes.filter(({ unitType: type }) => unitTypeMatches(type, unitType)) ?? [];
  const generalSummary = buildGeneralPlayerStatistics(source, new Set(selectedEventIds))
    .find(({ gamePlayerId: id }) => id === normalizedPlayerId) ?? null;

  const playerRows = playerHistoryRows(source.observations, eventTimeById, normalizedPlayerId, unitType);
  const commanderRows = commanderHistoryRows(source.observations, eventTimeById, normalizedPlayerId, unitType);
  const generalRows = generalHistoryRows(source.observations, source.commandGroupDescendants, eventTimeById, normalizedPlayerId);

  return {
    gamePlayerId: normalizedPlayerId,
    window,
    unitType,
    playerSummary,
    playerHistory: historyPage(playerRows, playerPage),
    commanderSummary,
    commanderHistory: historyPage(commanderRows, commanderPage),
    generalSummary,
    generalHistory: historyPage(generalRows, generalPage),
  };
}
