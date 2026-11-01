import "server-only";

import { getEffectiveFinalizedAuditObservations } from "@/modules/audits/server/statistics-source";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";

import { getCommanderStatistics } from "./commander";
import { getGeneralStatistics } from "./general";
import {
  LEADERBOARD_UNIT_TYPES,
  type LeaderboardBoard,
  type LeaderboardData,
  type LeaderboardPartition,
  type LeaderboardRow,
  type LeaderboardUnitType,
} from "./leaderboard-model";
import { getRankerStatistics } from "./ranker";
import { getDirectUnitPerformanceForAllUnits } from "./unit";
import {
  DEFAULT_STATISTICS_WINDOW,
  getStatisticsWindowRange,
  isEventTimeInStatisticsWindow,
  type StatisticsWindow,
} from "./windows";

/**
 * Public Player names for every Player result in the window, from the
 * approved Audits source. Unknown names fall back to the stable game Player ID
 * exactly as the Event Battle reader does.
 */
async function getPublicPlayerNames(window: StatisticsWindow, now: Date): Promise<Map<string, string>> {
  const range = getStatisticsWindowRange(window, now);
  const eventIds = (await getCanonicalEventTimes())
    .filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range))
    .map(({ eventId }) => eventId);
  const source = await getEffectiveFinalizedAuditObservations(eventIds);
  const names = new Map<string, string>();
  for (const observation of source.observations) {
    for (const result of observation.playerResults) {
      const name = result.publicName?.trim();
      if (name && !names.has(result.gamePlayerId)) names.set(result.gamePlayerId, name);
    }
  }
  return names;
}

function playerSubject(gamePlayerId: string, names: Map<string, string>): LeaderboardRow["subject"] {
  return { kind: "player", gamePlayerId, displayName: names.get(gamePlayerId) ?? gamePlayerId };
}

function partitionByType(entries: Array<{ unitType: LeaderboardUnitType; row: LeaderboardRow }>): LeaderboardPartition[] {
  return LEADERBOARD_UNIT_TYPES.map((unitType) => ({
    unitType,
    rows: entries.filter((entry) => entry.unitType === unitType).map((entry) => entry.row),
  }));
}

async function getPlayersBoard(window: StatisticsWindow, now: Date): Promise<LeaderboardPartition[]> {
  const [ranker, names] = await Promise.all([getRankerStatistics(window, now), getPublicPlayerNames(window, now)]);
  return partitionByType(
    ranker.players.flatMap((player) =>
      player.unitTypes.map((stats) => ({
        unitType: stats.unitType,
        row: {
          subject: playerSubject(player.gamePlayerId, names),
          metrics: {
            audits: { kind: "count", value: stats.auditAppearances },
            kills: { kind: "count", value: stats.totals.kills },
            deaths: { kind: "count", value: stats.totals.deaths },
            assists: { kind: "count", value: stats.totals.assists },
            kd: { kind: "ratio", ratio: stats.killDeathRatio },
            kad: { kind: "ratio", ratio: stats.killAssistDeathRatio },
            killsPerAudit: { kind: "average", value: stats.averagesPerAuditAppearance.kills },
          },
        },
      })),
    ),
  );
}

async function getCommandersBoard(window: StatisticsWindow, now: Date): Promise<LeaderboardPartition[]> {
  const [commander, names] = await Promise.all([getCommanderStatistics(window, now), getPublicPlayerNames(window, now)]);
  return partitionByType(
    commander.players.flatMap((player) =>
      player.unitTypes.map((stats) => ({
        unitType: stats.unitType,
        row: {
          subject: playerSubject(player.gamePlayerId, names),
          metrics: {
            battles: { kind: "count", value: stats.battlesCommanded },
            kd: { kind: "ratio", ratio: stats.killDeathRatio },
            kills: { kind: "count", value: stats.totals.kills },
            tickets: { kind: "count", value: stats.totals.tickets },
            flagCaptures: { kind: "count", value: stats.totals.flagCaptures },
            flagLosses: { kind: "count", value: stats.totals.flagLosses },
            stars: { kind: "count", value: stats.totals.stars },
            averagePlayers: { kind: "average", value: stats.averagesPerBattle.playerCount },
          },
        },
      })),
    ),
  );
}

async function getGeneralsBoard(window: StatisticsWindow, now: Date): Promise<LeaderboardPartition[]> {
  const [general, names] = await Promise.all([getGeneralStatistics(window, now), getPublicPlayerNames(window, now)]);
  return [{
    unitType: null,
    rows: general.players.map((player) => ({
      subject: playerSubject(player.gamePlayerId, names),
      metrics: {
        commands: { kind: "count", value: player.qualifyingGroupsCommanded },
        events: { kind: "count", value: player.distinctEventsCommanded },
        atomicUnits: { kind: "count", value: player.totalAtomicUnitsCommanded },
        regular: { kind: "count", value: player.atomicUnitsByType.REGULAR },
        rifles: { kind: "count", value: player.atomicUnitsByType.RIFLES },
        cavalry: { kind: "count", value: player.atomicUnitsByType.CAVALRY },
        artillery: { kind: "count", value: player.atomicUnitsByType.ARTILLERY },
      },
    })),
  }];
}

async function getUnitsBoard(window: StatisticsWindow, now: Date): Promise<LeaderboardPartition[]> {
  const performance = await getDirectUnitPerformanceForAllUnits(window, now);
  return partitionByType(
    performance.units.flatMap((unit) =>
      unit.unitTypes.map((stats) => ({
        unitType: stats.unitType,
        row: {
          subject: { kind: "unit", unitId: unit.unitId, unitName: unit.unitName || "Unnamed Unit" },
          metrics: {
            audits: { kind: "count", value: stats.auditCount },
            kd: { kind: "ratio", ratio: stats.killDeathRatio },
            kills: { kind: "count", value: stats.totals.kills },
            deaths: { kind: "count", value: stats.totals.deaths },
            tickets: { kind: "count", value: stats.totals.tickets },
            flagCaptures: { kind: "count", value: stats.totals.flagCaptures },
            flagLosses: { kind: "count", value: stats.totals.flagLosses },
            stars: { kind: "count", value: stats.totals.stars },
          },
        },
      })),
    ),
  );
}

const BOARD_READERS: Record<LeaderboardBoard, (window: StatisticsWindow, now: Date) => Promise<LeaderboardPartition[]>> = {
  players: getPlayersBoard,
  commanders: getCommandersBoard,
  generals: getGeneralsBoard,
  units: getUnitsBoard,
};

/** Public Leaderboard rows for one board and Statistics window. */
export async function getLeaderboard(
  board: LeaderboardBoard,
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): Promise<LeaderboardData> {
  return { window, board, partitions: await BOARD_READERS[board](window, now) };
}
