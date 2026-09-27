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

export type RankerUnitTypeStatistics = {
  unitType: AuditUnitType;
  totals: { kills: number; deaths: number; assists: number };
  averagesPerAuditAppearance: { kills: number; deaths: number; assists: number };
  killDeathRatio: RatioMetric;
  killAssistDeathRatio: RatioMetric;
  auditAppearances: number;
};

export type RankerPlayerStatistics = {
  gamePlayerId: string;
  distinctEvents: number;
  unitTypes: RankerUnitTypeStatistics[];
};

export type RankerStatistics = {
  window: StatisticsWindow;
  players: RankerPlayerStatistics[];
};

export async function getRankerStatistics(
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): Promise<RankerStatistics> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimes = await getCanonicalEventTimes();
  const selectedEventIds = eventTimes
    .filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range))
    .map(({ eventId }) => eventId);
  const source = await getEffectiveFinalizedAuditObservations(selectedEventIds);

  const players = new Map<string, { distinctEvents: number; unitTypes: RankerUnitTypeStatistics[] }>();
  for (const aggregate of source.rankerAggregates) {
    const appearances = aggregate.auditAppearances;
    const unitStatistics: RankerUnitTypeStatistics = {
      unitType: aggregate.unitType,
      totals: {
        kills: aggregate.kills,
        deaths: aggregate.deaths,
        assists: aggregate.assists,
      },
      averagesPerAuditAppearance: {
        kills: aggregate.kills / appearances,
        deaths: aggregate.deaths / appearances,
        assists: aggregate.assists / appearances,
      },
      killDeathRatio: deriveRatio(aggregate.kills, aggregate.deaths, "K"),
      killAssistDeathRatio: deriveRatio(aggregate.kills + aggregate.assists, aggregate.deaths, "K+A"),
      auditAppearances: appearances,
    };
    const playerStatistics = players.get(aggregate.gamePlayerId) ?? {
      distinctEvents: aggregate.distinctEvents,
      unitTypes: [],
    };
    playerStatistics.unitTypes.push(unitStatistics);
    players.set(aggregate.gamePlayerId, playerStatistics);
  }

  return {
    window,
    players: [...players.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([gamePlayerId, playerStatistics]) => ({
        gamePlayerId,
        distinctEvents: playerStatistics.distinctEvents,
        unitTypes: playerStatistics.unitTypes.sort((left, right) => left.unitType.localeCompare(right.unitType)),
      })),
  };
}
