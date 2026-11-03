import "server-only";

import { getPlayerIdentityPresentationBatch } from "@/modules/players/server/queries";

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
  type StatisticsWindow,
} from "./windows";

function playerSubject(gamePlayerId: string): LeaderboardRow["subject"] {
  return {
    kind: "player",
    gamePlayerId,
    robloxUsername: null,
    robloxAvatarUrl: null,
  };
}

function partitionByType(entries: Array<{ unitType: LeaderboardUnitType; row: LeaderboardRow }>): LeaderboardPartition[] {
  return LEADERBOARD_UNIT_TYPES.map((unitType) => ({
    unitType,
    rows: entries.filter((entry) => entry.unitType === unitType).map((entry) => entry.row),
  }));
}

async function getPlayersBoard(window: StatisticsWindow, now: Date): Promise<LeaderboardPartition[]> {
  const ranker = await getRankerStatistics(window, now);
  return partitionByType(
    ranker.players.flatMap((player) =>
      player.unitTypes.map((stats) => ({
        unitType: stats.unitType,
        row: {
          subject: playerSubject(player.gamePlayerId),
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
  const commander = await getCommanderStatistics(window, now);
  return partitionByType(
    commander.players.flatMap((player) =>
      player.unitTypes.map((stats) => ({
        unitType: stats.unitType,
        row: {
          subject: playerSubject(player.gamePlayerId),
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
  const general = await getGeneralStatistics(window, now);
  return [{
    unitType: null,
    rows: general.players.map((player) => ({
      subject: playerSubject(player.gamePlayerId),
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
  const partitions = await BOARD_READERS[board](window, now);
  const playerIds = [...new Set(
    partitions.flatMap(({ rows }) => rows.flatMap((row) =>
      row.subject.kind === "player" ? [row.subject.gamePlayerId] : [],
    )),
  )];
  const identities = await getPlayerIdentityPresentationBatch(playerIds);
  const identityById = new Map(identities.map((identity) => [identity.playerId, identity]));

  return {
    window,
    board,
    partitions: partitions.map((partition) => ({
      ...partition,
      rows: partition.rows.map((row) => {
        if (row.subject.kind !== "player") return row;
        const identity = identityById.get(row.subject.gamePlayerId);
        if (!identity) throw new Error(`Missing Player identity presentation for ${row.subject.gamePlayerId}`);
        return {
          ...row,
          subject: {
            ...row.subject,
            robloxUsername: identity.robloxUsername,
            robloxAvatarUrl: identity.robloxAvatarUrl,
          },
        };
      }),
    })),
  };
}
