import "server-only";

import type { AuditUnitType } from "@prisma/client";

import { getEffectiveFinalizedAuditObservations } from "@/modules/audits/server/statistics-source";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";

import { deriveRatio, type RatioMetric } from "./ratios";
import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
  type StatisticsWindow,
} from "./windows";

type RawTotals = {
  kills: number;
  deaths: number;
  assists: number;
  tickets: number;
  flagCaptures: number;
  flagLosses: number;
  stars: number;
  playerCount: number;
};

export type CommanderUnitStatistics = {
  unitType: AuditUnitType;
  battlesCommanded: number;
  totals: Omit<RawTotals, "playerCount">;
  killDeathRatio: RatioMetric;
  averagesPerBattle: RawTotals;
  averageKillDeathRatio: RatioMetric;
};

export type CommanderPlayerStatistics = {
  gamePlayerId: string;
  unitTypes: CommanderUnitStatistics[];
};

export type CommanderStatistics = {
  window: StatisticsWindow;
  players: CommanderPlayerStatistics[];
};

function emptyTotals(): RawTotals {
  return { kills: 0, deaths: 0, assists: 0, tickets: 0, flagCaptures: 0, flagLosses: 0, stars: 0, playerCount: 0 };
}

function addObservationTotals(totals: RawTotals, observation: {
  unitResults: { tickets: number | null; flagCaptures: number | null; flagLosses: number | null; stars: number | null };
  playerResults: Array<{ kills: number; deaths: number; assists: number }>;
}): void {
  totals.kills += observation.playerResults.reduce((sum, result) => sum + result.kills, 0);
  totals.deaths += observation.playerResults.reduce((sum, result) => sum + result.deaths, 0);
  totals.assists += observation.playerResults.reduce((sum, result) => sum + result.assists, 0);
  totals.tickets += observation.unitResults.tickets ?? 0;
  totals.flagCaptures += observation.unitResults.flagCaptures ?? 0;
  totals.flagLosses += observation.unitResults.flagLosses ?? 0;
  totals.stars += observation.unitResults.stars ?? 0;
  totals.playerCount += observation.playerResults.length;
}

export async function getCommanderStatistics(
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): Promise<CommanderStatistics> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimes = await getCanonicalEventTimes();
  const eventIds = eventTimes.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range)).map(({ eventId }) => eventId);
  const source = await getEffectiveFinalizedAuditObservations(eventIds);
  const aggregates = new Map<string, Map<AuditUnitType, { battles: number; totals: RawTotals }>>();

  for (const observation of source.observations) {
    if (observation.commanderGamePlayerId === null || observation.unitType === null) continue;
    const byType = aggregates.get(observation.commanderGamePlayerId) ?? new Map();
    const aggregate = byType.get(observation.unitType) ?? { battles: 0, totals: emptyTotals() };
    aggregate.battles += 1;
    addObservationTotals(aggregate.totals, observation);
    byType.set(observation.unitType, aggregate);
    aggregates.set(observation.commanderGamePlayerId, byType);
  }

  return {
    window,
    players: [...aggregates.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([gamePlayerId, byType]) => ({
      gamePlayerId,
      unitTypes: [...byType.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unitType, aggregate]) => {
        const totals = {
          kills: aggregate.totals.kills,
          deaths: aggregate.totals.deaths,
          assists: aggregate.totals.assists,
          tickets: aggregate.totals.tickets,
          flagCaptures: aggregate.totals.flagCaptures,
          flagLosses: aggregate.totals.flagLosses,
          stars: aggregate.totals.stars,
        };
        const averagesPerBattle = Object.fromEntries(
          Object.entries(aggregate.totals).map(([key, value]) => [key, value / aggregate.battles]),
        ) as RawTotals;
        return {
          unitType,
          battlesCommanded: aggregate.battles,
          totals,
          killDeathRatio: deriveRatio(totals.kills, totals.deaths, "K"),
          averagesPerBattle,
          averageKillDeathRatio: deriveRatio(totals.kills, totals.deaths, "K"),
        };
      }),
    })),
  };
}