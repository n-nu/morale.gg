import "server-only";

import type { AuditUnitType } from "@prisma/client";

import { getEffectiveFinalizedAuditObservations, type EffectiveFinalizedAuditObservation } from "@/modules/audits/server/statistics-source";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";

import { deriveRatio, type RatioMetric } from "./ratios";
import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
  type StatisticsWindow,
} from "./windows";

const UNIT_TYPES: AuditUnitType[] = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"];

type CombatTotals = {
  kills: number;
  deaths: number;
  assists: number;
  tickets: number;
  flagCaptures: number;
  flagLosses: number;
  stars: number;
  playerCount: number;
};

export type GeneralCombatStatistics = {
  unitType: AuditUnitType;
  atomicUnits: number;
  totals: Omit<CombatTotals, "playerCount">;
  killDeathRatio: RatioMetric;
  averagesPerAtomicUnit: CombatTotals;
};

export type GeneralPlayerStatistics = {
  gamePlayerId: string;
  qualifyingGroupsCommanded: number;
  distinctEventsCommanded: number;
  totalAtomicUnitsCommanded: number;
  atomicUnitsByType: Record<AuditUnitType, number>;
  combatByType: GeneralCombatStatistics[];
};

export type GeneralStatistics = {
  window: StatisticsWindow;
  players: GeneralPlayerStatistics[];
};

function emptyTotals(): CombatTotals {
  return { kills: 0, deaths: 0, assists: 0, tickets: 0, flagCaptures: 0, flagLosses: 0, stars: 0, playerCount: 0 };
}

function addAudit(totals: CombatTotals, observation: EffectiveFinalizedAuditObservation): void {
  for (const result of observation.playerResults) {
    totals.kills += result.kills;
    totals.deaths += result.deaths;
    totals.assists += result.assists;
  }
  totals.tickets += observation.unitResults.tickets ?? 0;
  totals.flagCaptures += observation.unitResults.flagCaptures ?? 0;
  totals.flagLosses += observation.unitResults.flagLosses ?? 0;
  totals.stars += observation.unitResults.stars ?? 0;
  totals.playerCount += observation.playerResults.length;
}

export async function getGeneralStatistics(
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): Promise<GeneralStatistics> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimes = await getCanonicalEventTimes();
  const selectedEvents = new Set(eventTimes.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range)).map(({ eventId }) => eventId));
  const source = await getEffectiveFinalizedAuditObservations([...selectedEvents]);
  const observationsByAtomicId = new Map(source.observations.map((observation) => [observation.atomicEventUnitId, observation]));
  const players = new Map<string, { groups: number; events: Set<string>; atomicUnits: number; byType: Record<AuditUnitType, number>; combat: Map<AuditUnitType, { units: number; totals: CombatTotals }> }>();

  for (const group of source.commandGroupDescendants) {
    if (!selectedEvents.has(group.eventId) || !group.commanderGamePlayerId || group.descendantAtomicEventUnitIds.length < 2) continue;
    const player = players.get(group.commanderGamePlayerId) ?? {
      groups: 0,
      events: new Set<string>(),
      atomicUnits: 0,
      byType: { REGULAR: 0, RIFLES: 0, CAVALRY: 0, ARTILLERY: 0 },
      combat: new Map(),
    };
    player.groups += 1;
    player.events.add(group.eventId);
    player.atomicUnits += group.descendantAtomicEventUnitIds.length;
    for (const atomicId of group.descendantAtomicEventUnitIds) {
      const observation = observationsByAtomicId.get(atomicId);
      if (observation?.unitType === null || observation?.unitType === undefined) continue;
      player.byType[observation.unitType] += 1;
      const combat = player.combat.get(observation.unitType) ?? { units: 0, totals: emptyTotals() };
      combat.units += 1;
      addAudit(combat.totals, observation);
      player.combat.set(observation.unitType, combat);
    }
    players.set(group.commanderGamePlayerId, player);
  }

  return {
    window,
    players: [...players.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([gamePlayerId, player]) => ({
      gamePlayerId,
      qualifyingGroupsCommanded: player.groups,
      distinctEventsCommanded: player.events.size,
      totalAtomicUnitsCommanded: player.atomicUnits,
      atomicUnitsByType: player.byType,
      combatByType: UNIT_TYPES.filter((unitType) => player.combat.has(unitType)).map((unitType) => {
        const combat = player.combat.get(unitType)!;
        const totals = {
          kills: combat.totals.kills,
          deaths: combat.totals.deaths,
          assists: combat.totals.assists,
          tickets: combat.totals.tickets,
          flagCaptures: combat.totals.flagCaptures,
          flagLosses: combat.totals.flagLosses,
          stars: combat.totals.stars,
        };
        return {
          unitType,
          atomicUnits: combat.units,
          totals,
          killDeathRatio: deriveRatio(totals.kills, totals.deaths, "K"),
          averagesPerAtomicUnit: Object.fromEntries(Object.entries(combat.totals).map(([key, value]) => [key, value / combat.units])) as CombatTotals,
        };
      }),
    })),
  };
}