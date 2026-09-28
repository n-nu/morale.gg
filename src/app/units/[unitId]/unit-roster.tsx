import { getAuthenticatedUserId } from "@/lib/website-admin";
import { getCurrentRoster } from "@/modules/players/server/queries";
import { Roster, type RosterEntry } from "@/modules/players/components/roster";
import { canManageRoster } from "@/modules/units/server/authorization";
import {
  getAttendanceSummaryForPlayerUnit,
  getRankerStatistics,
  type StatisticsWindow,
} from "@/modules/statistics";
import type { AttendanceSummary } from "@/modules/statistics/attendance";

export async function UnitRoster({
  unitId,
  window,
}: {
  unitId: string;
  window: StatisticsWindow;
}) {
  const [entries, userId] = await Promise.all([
    getCurrentRoster(unitId),
    getAuthenticatedUserId(),
  ]);
  const canManage = userId !== null && await canManageRoster(userId, unitId);

  const rankerByPlayer = new Map<string, RosterEntry["ranker"]>();
  let statisticsError = false;
  if (entries.length > 0) {
    try {
      const ranker = await getRankerStatistics(window);
      for (const player of ranker.players) {
        rankerByPlayer.set(player.gamePlayerId, {
          distinctEvents: player.distinctEvents,
          unitTypes: Object.fromEntries(player.unitTypes.map((stats) => [
            stats.unitType,
            {
              kills: stats.totals.kills,
              deaths: stats.totals.deaths,
              assists: stats.totals.assists,
              kdr: stats.killDeathRatio.display,
            },
          ])) as NonNullable<RosterEntry["ranker"]>["unitTypes"],
        });
      }
    } catch {
      statisticsError = true;
    }
  }

  const attendanceByPlayer = new Map<string, AttendanceSummary>();
  let attendanceError = false;
  try {
    const summaries = await Promise.all(entries.map(async (entry) => [
      entry.player.playerId,
      await getAttendanceSummaryForPlayerUnit({
        gamePlayerId: entry.player.playerId,
        unitId,
        window,
      }),
    ] as const));
    for (const [gamePlayerId, summary] of summaries) {
      attendanceByPlayer.set(gamePlayerId, summary);
    }
  } catch {
    attendanceError = entries.length > 0;
  }

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    ranker: rankerByPlayer.get(entry.player.playerId),
    attendance: attendanceByPlayer.get(entry.player.playerId),
  }));

  return (
    <Roster
      unitId={unitId}
      entries={enrichedEntries}
      canManage={canManage}
      window={window}
      statisticsError={statisticsError}
      attendanceError={attendanceError}
    />
  );
}
