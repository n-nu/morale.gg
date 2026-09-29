import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, PageHeader, SectionHeading } from "@/app/presentation";
import { findPlayerByGameId, getPlayerMemberships } from "@/modules/players/server/queries";
import {
  getAttendanceSummaryForPlayerUnit,
  getCommanderStatistics,
  getGeneralStatistics,
  getRankerStatistics,
} from "@/modules/statistics";
import {
  AttendanceSummaryPanel,
  StatisticsDisclosure,
  StatisticsEmptyState,
  StatisticsErrorState,
  resolveStatisticsWindow,
} from "@/modules/statistics/presentation";
import { PlayerStatisticsSections } from "@/modules/statistics/player-presentation";
import { StatisticsWindowSelector } from "@/modules/statistics/window-selector";

export const dynamic = "force-dynamic";

function playerName(player: { name: string | null; playerId: string }) {
  return player.name?.trim() || player.playerId;
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const { id: playerId } = await params;
  const { window } = await searchParams;
  const player = await findPlayerByGameId(playerId);
  if (!player) notFound();

  const selectedWindow = resolveStatisticsWindow(window);
  const [memberships, ranker, commander, general] = await Promise.all([
    getPlayerMemberships(player.id),
    getRankerStatistics(selectedWindow),
    getCommanderStatistics(selectedWindow),
    getGeneralStatistics(selectedWindow),
  ]);

  let attendanceSummaries: Array<{
    membership: (typeof memberships)[number];
    summary: Awaited<ReturnType<typeof getAttendanceSummaryForPlayerUnit>>;
  }> = [];
  let attendanceError = false;
  try {
    attendanceSummaries = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        summary: await getAttendanceSummaryForPlayerUnit({
          gamePlayerId: player.playerId,
          unitId: membership.unitId,
          window: selectedWindow,
        }),
      })),
    );
  } catch {
    attendanceError = true;
  }

  const rankerEntry = ranker.players.find((entry) => entry.gamePlayerId === player.playerId);
  const commanderEntry = commander.players.find((entry) => entry.gamePlayerId === player.playerId);
  const generalEntry = general.players.find((entry) => entry.gamePlayerId === player.playerId);

  return (
    <>
      <Breadcrumbs items={[
        { label: "Community", href: "/events" },
        { label: "Players", href: "/players" },
        { label: playerName(player) },
      ]} />
      <PageHeader
        category="Player record"
        title={playerName(player)}
        description={<>Game Player ID: <span className="break-all font-mono text-xs">{player.playerId}</span></>}
        actions={<StatisticsWindowSelector value={selectedWindow} />}
      />

      <PlayerStatisticsSections
        ranker={rankerEntry}
        commander={commanderEntry}
        general={generalEntry}
        window={selectedWindow}
      />

      <section className="mt-8" aria-labelledby="attendance-heading">
        <SectionHeading id="attendance-heading" title="Attendance by Unit" detail={selectedWindow} />
        {attendanceError ? (
          <div className="mt-3"><StatisticsErrorState message="Attendance could not be loaded for this Player." /></div>
        ) : attendanceSummaries.length === 0 ? (
          <div className="mt-3"><StatisticsEmptyState title="No Unit attendance scope" description="This Player has no Unit membership history to use for attendance." /></div>
        ) : (
          <div className="divide-y divide-edge border-b border-edge">
            {attendanceSummaries.map(({ membership, summary }) => (
              <article key={membership.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                  <Link href={`/units/${membership.unitId}`} className="text-sm font-bold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold">
                    {membership.unit.name}
                  </Link>
                  <details>
                    <summary className="cursor-pointer list-none text-xs font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
                      {summary.obligations === 0 ? "No requirement" : summary.noResolvedData ? "Pending" : `${summary.percentage}% resolved`}
                    </summary>
                    <div className="pt-2"><AttendanceSummaryPanel summary={summary} /></div>
                  </details>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="membership-history-heading">
        <StatisticsDisclosure
          title="Membership history"
          headingLevel={2}
          headingId="membership-history-heading"
          summary={`${memberships.length} records`}
        >
          {memberships.length ? (
            <ul className="divide-y divide-edge border-b border-edge">
              {memberships.map((membership) => (
                <li key={membership.id} className="py-3">
                  <Link className="font-semibold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold" href={`/units/${membership.unitId}`}>
                    {membership.unit.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    Joined {membership.startedAt.toISOString().replace("T", " ").slice(0, 19)} UTC · {membership.endedAt ? `Ended ${membership.endedAt.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Active"}
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No membership history.</p>}
        </StatisticsDisclosure>
      </section>
    </>
  );
}
