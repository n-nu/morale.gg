import "server-only";

import type { AuditUnitType } from "@prisma/client";

import { getEffectiveFinalizedAuditObservations } from "@/modules/audits/server/statistics-source";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";
import { prisma } from "@/lib/prisma";
import { getSubtreeUnitIds } from "@/modules/units/server/statistics-source";

import { deriveRatio, type RatioMetric } from "./ratios";
import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
  type StatisticsWindow,
} from "./windows";

export type UnitPerformanceTotals = {
  kills: number;
  deaths: number;
  assists: number;
  tickets: number;
  flagCaptures: number;
  flagLosses: number;
  stars: number;
  playerCount: number;
};

export type UnitPerformanceByType = {
  unitType: AuditUnitType;
  auditCount: number;
  totals: Omit<UnitPerformanceTotals, "playerCount">;
  averagePerAudit: Omit<UnitPerformanceTotals, "playerCount">;
  killDeathRatio: RatioMetric;
};

export type DirectUnitPerformance = {
  window: StatisticsWindow;
  unitId: string;
  unitTypes: UnitPerformanceByType[];
};

export type OrganizationalUnitPerformance = {
  window: StatisticsWindow;
  unitId: string;
  unitTypes: UnitPerformanceByType[];
};

export type AverageUnitPerformance = {
  window: StatisticsWindow;
  unitId: string;
  qualifyingUnitCount: number;
  unitTypes: Array<{
    unitType: AuditUnitType;
    qualifyingUnits: number;
    averagePerQualifyingUnit: Omit<UnitPerformanceTotals, "playerCount">;
  }>;
};

type RawObservation = {
  representedUnitId: string;
  unitType: AuditUnitType | null;
  playerResults: Array<{ kills: number; deaths: number; assists: number }>;
  unitResults: { tickets: number | null; flagCaptures: number | null; flagLosses: number | null; stars: number | null };
};

function emptyTotals(): UnitPerformanceTotals {
  return {
    kills: 0,
    deaths: 0,
    assists: 0,
    tickets: 0,
    flagCaptures: 0,
    flagLosses: 0,
    stars: 0,
    playerCount: 0,
  };
}

function addObservationToTotals(totals: UnitPerformanceTotals, observation: RawObservation): void {
  totals.kills += observation.playerResults.reduce((sum, result) => sum + result.kills, 0);
  totals.deaths += observation.playerResults.reduce((sum, result) => sum + result.deaths, 0);
  totals.assists += observation.playerResults.reduce((sum, result) => sum + result.assists, 0);
  totals.tickets += observation.unitResults.tickets ?? 0;
  totals.flagCaptures += observation.unitResults.flagCaptures ?? 0;
  totals.flagLosses += observation.unitResults.flagLosses ?? 0;
  totals.stars += observation.unitResults.stars ?? 0;
  totals.playerCount += observation.playerResults.length;
}

function summarizeByType(observations: RawObservation[]): Map<AuditUnitType, { auditCount: number; totals: UnitPerformanceTotals }> {
  const results = new Map<AuditUnitType, { auditCount: number; totals: UnitPerformanceTotals }>();
  for (const observation of observations) {
    if (observation.unitType === null) continue;
    const aggregate = results.get(observation.unitType) ?? { auditCount: 0, totals: emptyTotals() };
    aggregate.auditCount += 1;
    addObservationToTotals(aggregate.totals, observation);
    results.set(observation.unitType, aggregate);
  }
  return results;
}

function toPerformanceByType(typeMap: Map<AuditUnitType, { auditCount: number; totals: UnitPerformanceTotals }>): UnitPerformanceByType[] {
  return [...typeMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unitType, aggregate]) => {
    const totals = {
      kills: aggregate.totals.kills,
      deaths: aggregate.totals.deaths,
      assists: aggregate.totals.assists,
      tickets: aggregate.totals.tickets,
      flagCaptures: aggregate.totals.flagCaptures,
      flagLosses: aggregate.totals.flagLosses,
      stars: aggregate.totals.stars,
    };
    return {
      unitType,
      auditCount: aggregate.auditCount,
      totals,
      averagePerAudit: Object.fromEntries(
        Object.entries(totals).map(([key, value]) => [key, value / aggregate.auditCount]),
      ) as Omit<UnitPerformanceTotals, "playerCount">,
      killDeathRatio: deriveRatio(totals.kills, totals.deaths, "K"),
    };
  });
}

export async function getDirectUnitPerformance(
  unitId: string,
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): Promise<DirectUnitPerformance> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimeRows = await getCanonicalEventTimes();
  const selectedEventIds = new Set(
    eventTimeRows.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range)).map(({ eventId }) => eventId),
  );
  if (selectedEventIds.size === 0) {
    return { window, unitId, unitTypes: [] };
  }

  const source = await getEffectiveFinalizedAuditObservations([...selectedEventIds]);
  const directObservations = source.observations.filter((observation) => observation.representedUnitId === unitId);
  return {
    window,
    unitId,
    unitTypes: toPerformanceByType(summarizeByType(directObservations)),
  };
}

export async function getOrganizationalUnitPerformance(
  unitId: string,
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
  db = prisma,
): Promise<OrganizationalUnitPerformance> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimeRows = await getCanonicalEventTimes();
  const selectedEventIds = new Set(
    eventTimeRows.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range)).map(({ eventId }) => eventId),
  );
  if (selectedEventIds.size === 0) {
    return { window, unitId, unitTypes: [] };
  }

  const subtree = new Set(await getSubtreeUnitIds(unitId, db));
  const source = await getEffectiveFinalizedAuditObservations([...selectedEventIds]);
  const organizationalObservations = source.observations.filter((observation) => subtree.has(observation.representedUnitId));
  return {
    window,
    unitId,
    unitTypes: toPerformanceByType(summarizeByType(organizationalObservations)),
  };
}

export async function getAverageUnitPerformance(
  unitId: string,
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
  db = prisma,
): Promise<AverageUnitPerformance> {
  const range = getStatisticsWindowRange(window, now);
  const eventTimeRows = await getCanonicalEventTimes();
  const selectedEventIds = new Set(
    eventTimeRows.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range)).map(({ eventId }) => eventId),
  );
  if (selectedEventIds.size === 0) {
    return { window, unitId, qualifyingUnitCount: 0, unitTypes: [] };
  }

  const subtree = new Set(await getSubtreeUnitIds(unitId, db));
  const source = await getEffectiveFinalizedAuditObservations([...selectedEventIds]);
  const qualifyingByType = new Map<AuditUnitType, Map<string, UnitPerformanceTotals>>();

  for (const observation of source.observations) {
    if (!subtree.has(observation.representedUnitId) || observation.unitType === null) continue;
    const perUnit = qualifyingByType.get(observation.unitType) ?? new Map<string, UnitPerformanceTotals>();
    const aggregate = perUnit.get(observation.representedUnitId) ?? emptyTotals();
    addObservationToTotals(aggregate, observation);
    perUnit.set(observation.representedUnitId, aggregate);
    qualifyingByType.set(observation.unitType, perUnit);
  }

  const unitTypes = [...qualifyingByType.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unitType, perUnit]) => {
    const qualifyingUnits = perUnit.size;
    const totals = Array.from(perUnit.values()).reduce((sum, item) => {
      sum.kills += item.kills;
      sum.deaths += item.deaths;
      sum.assists += item.assists;
      sum.tickets += item.tickets;
      sum.flagCaptures += item.flagCaptures;
      sum.flagLosses += item.flagLosses;
      sum.stars += item.stars;
      return sum;
    }, emptyTotals());

    return {
      unitType,
      qualifyingUnits,
      averagePerQualifyingUnit: {
        kills: totals.kills / qualifyingUnits,
        deaths: totals.deaths / qualifyingUnits,
        assists: totals.assists / qualifyingUnits,
        tickets: totals.tickets / qualifyingUnits,
        flagCaptures: totals.flagCaptures / qualifyingUnits,
        flagLosses: totals.flagLosses / qualifyingUnits,
        stars: totals.stars / qualifyingUnits,
      },
    };
  });

  const qualifyingUnitCount = unitTypes.reduce((sum, entry) => sum + entry.qualifyingUnits, 0);
  return {
    window,
    unitId,
    qualifyingUnitCount,
    unitTypes: unitTypes.filter((entry) => entry.qualifyingUnits > 0),
  };
}
