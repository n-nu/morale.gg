import Link from "next/link";
import { notFound } from "next/navigation";

import { getPlayer, getPlayerMemberships } from "@/modules/players/server/queries";
import {
  getCommanderStatistics,
  getGeneralStatistics,
  getRankerStatistics,
} from "@/modules/statistics";
import {
  StatisticsEmptyState,
  StatisticsRatio,
  TypeSummaryCard,
  UnitTypeLabel,
  resolveStatisticsWindow,
} from "@/modules/statistics/presentation";
import { StatisticsWindowSelector } from "@/modules/statistics/window-selector";

export const dynamic = "force-dynamic";

const typeOrder = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;

function formatMetric(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.0+$/, "");
}

function PlayerName(player: { name: string | null; playerId: string }) {
  return player.name?.trim() || player.playerId;
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const { id } = await params;
  const { window } = await searchParams;
  const player = await getPlayer(id);
  if (!player) notFound();

  const selectedWindow = resolveStatisticsWindow(window);
  const [memberships, ranker, commander, general] = await Promise.all([
    getPlayerMemberships(id),
    getRankerStatistics(selectedWindow),
    getCommanderStatistics(selectedWindow),
    getGeneralStatistics(selectedWindow),
  ]);

  const rankerEntry = ranker.players.find((entry) => entry.gamePlayerId === player.playerId);
  const commanderEntry = commander.players.find((entry) => entry.gamePlayerId === player.playerId);
  const generalEntry = general.players.find((entry) => entry.gamePlayerId === player.playerId);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">Public profile</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">{PlayerName(player)}</h1>
            <p className="mt-2 break-all text-muted">Game Player ID: {player.playerId}</p>
          </div>
          <StatisticsWindowSelector value={selectedWindow} />
        </div>
      </header>

      <section className="mb-10 rounded-xl border border-edge bg-surface p-5">
        <h2 className="text-xl font-semibold text-white">Membership history</h2>
        {memberships.length ? (
          <ul className="mt-4 divide-y divide-edge">
            {memberships.map((membership) => (
              <li key={membership.id} className="py-4">
                <Link className="font-semibold underline" href={`/units/${membership.unitId}`}>
                  {membership.unit.name}
                </Link>
                <p className="text-sm text-muted">
                  Joined {membership.startedAt.toISOString().replace("T", " ").slice(0, 19)} UTC · {membership.endedAt ? `Ended ${membership.endedAt.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Active"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No membership history yet.</p>
        )}
      </section>

      {!rankerEntry && !commanderEntry && !generalEntry ? (
        <StatisticsEmptyState
          title="No statistics in this window"
          description="This public Player has no Ranker, Commander, or General observations for the selected period."
        />
      ) : null}

      {rankerEntry ? (
        <section className="mb-10 space-y-5" aria-labelledby="ranker-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="ranker-heading" className="text-2xl font-semibold text-white">Ranker</h2>
            <span className="rounded-full border border-edge bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              {rankerEntry.distinctEvents} distinct events
            </span>
          </div>

          {typeOrder.map((unitType) => {
            const typeStats = rankerEntry.unitTypes.find((entry) => entry.unitType === unitType);
            if (!typeStats) return null;
            const totals = typeStats.totals;
            return (
              <TypeSummaryCard key={unitType} unitType={unitType} title={UnitTypeLabel[unitType]}>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Kills</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(totals.kills)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Deaths</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(totals.deaths)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Assists</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(totals.assists)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">KDR</p>
                  <p className="mt-2 text-lg font-semibold text-white"><StatisticsRatio ratio={typeStats.killDeathRatio} /></p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">(K+A)/D</p>
                  <p className="mt-2 text-lg font-semibold text-white"><StatisticsRatio ratio={typeStats.killAssistDeathRatio} /></p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Audit appearances</p>
                  <p className="mt-2 text-lg font-semibold text-white">{typeStats.auditAppearances}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg kills / appearance</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(typeStats.averagesPerAuditAppearance.kills)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg deaths / appearance</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(typeStats.averagesPerAuditAppearance.deaths)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg assists / appearance</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(typeStats.averagesPerAuditAppearance.assists)}</p>
                </div>
              </TypeSummaryCard>
            );
          })}
        </section>
      ) : null}

      {commanderEntry ? (
        <section className="mb-10 space-y-5" aria-labelledby="commander-heading">
          <h2 id="commander-heading" className="text-2xl font-semibold text-white">Commander</h2>
          {typeOrder.map((unitType) => {
            const stats = commanderEntry.unitTypes.find((entry) => entry.unitType === unitType);
            if (!stats) return null;
            return (
              <TypeSummaryCard key={unitType} unitType={unitType} title={UnitTypeLabel[unitType]}>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Battles commanded</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.battlesCommanded}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Total kills</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.kills}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Total deaths</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.deaths}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Total assists</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.assists}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Pooled KDR</p>
                  <p className="mt-2 text-lg font-semibold text-white"><StatisticsRatio ratio={stats.killDeathRatio} /></p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Tickets</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.tickets}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Flag captures</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.flagCaptures}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Flag losses</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.flagLosses}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Stars</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.stars}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg kills / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.kills)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg deaths / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.deaths)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg assists / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.assists)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg tickets / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.tickets)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg flag captures / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.flagCaptures)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg flag losses / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.flagLosses)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg stars / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.stars)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg player count / battle</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerBattle.playerCount)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg KDR</p>
                  <p className="mt-2 text-lg font-semibold text-white"><StatisticsRatio ratio={stats.averageKillDeathRatio} /></p>
                </div>
              </TypeSummaryCard>
            );
          })}
        </section>
      ) : null}

      {generalEntry ? (
        <section className="mb-10 space-y-5" aria-labelledby="general-heading">
          <h2 id="general-heading" className="text-2xl font-semibold text-white">General</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-edge bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Qualifying groups</p>
              <p className="mt-2 text-lg font-semibold text-white">{generalEntry.qualifyingGroupsCommanded}</p>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Distinct events</p>
              <p className="mt-2 text-lg font-semibold text-white">{generalEntry.distinctEventsCommanded}</p>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Total atomic units</p>
              <p className="mt-2 text-lg font-semibold text-white">{generalEntry.totalAtomicUnitsCommanded}</p>
            </div>
          </div>
          {typeOrder.map((unitType) => {
            const stats = generalEntry.combatByType.find((entry) => entry.unitType === unitType);
            if (!stats) return null;
            return (
              <TypeSummaryCard key={unitType} unitType={unitType} title={UnitTypeLabel[unitType]}>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Atomic units</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.atomicUnits}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Kills</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.kills}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Deaths</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.deaths}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Assists</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stats.totals.assists}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">KDR</p>
                  <p className="mt-2 text-lg font-semibold text-white"><StatisticsRatio ratio={stats.killDeathRatio} /></p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg kills / unit</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerAtomicUnit.kills)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg deaths / unit</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerAtomicUnit.deaths)}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Avg assists / unit</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatMetric(stats.averagesPerAtomicUnit.assists)}</p>
                </div>
              </TypeSummaryCard>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
