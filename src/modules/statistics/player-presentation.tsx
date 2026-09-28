import type { ReactNode } from "react";

import type { CommanderPlayerStatistics } from "./commander";
import type { GeneralPlayerStatistics } from "./general";
import {
  StatisticsDisclosure,
  StatisticsEmptyState,
  StatisticsRatio,
  UnitTypeLabel,
} from "./presentation";
import type { RankerPlayerStatistics } from "./ranker";
import type { StatisticsWindow } from "./windows";

const typeOrder = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;

function formatMetric(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.0+$/, "");
}

function MetricGrid({ values }: { values: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-edge sm:grid-cols-3 xl:grid-cols-5">
      {values.map(([label, value]) => (
        <div key={label} className="border-l border-edge py-2 pl-3 first:border-l-0 first:pl-0">
          <dt className="text-[11px] font-bold uppercase text-muted">{label}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function rankerValues(player: RankerPlayerStatistics) {
  return typeOrder.flatMap((unitType) =>
    player.unitTypes
      .filter((stats) => stats.unitType === unitType)
      .map((stats) => ({ unitType, stats })),
  );
}

function RankerDetails({ player }: { player: RankerPlayerStatistics }) {
  const types = rankerValues(player);
  return (
    <StatisticsDisclosure
      title="Ranker details"
      headingLevel={3}
      triggerLabel="Show Ranker details"
      summary={`${types.length} Unit types`}
    >
      <div className="space-y-2">
        {types.map(({ unitType, stats }, index) => (
          <details key={unitType} open={index === 0} className="border-b border-edge">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 py-2 text-sm font-bold text-foreground outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              <span>{UnitTypeLabel[unitType]}</span>
              <span className="text-xs font-normal text-muted">KDR <StatisticsRatio ratio={stats.killDeathRatio} /></span>
            </summary>
            <div className="pb-3">
              <MetricGrid values={[
                ["(K+A)/D", <StatisticsRatio key="ratio" ratio={stats.killAssistDeathRatio} />],
                ["Audits", stats.auditAppearances],
                ["Avg K", formatMetric(stats.averagesPerAuditAppearance.kills)],
                ["Avg D", formatMetric(stats.averagesPerAuditAppearance.deaths)],
                ["Avg A", formatMetric(stats.averagesPerAuditAppearance.assists)],
              ]} />
            </div>
          </details>
        ))}
      </div>
    </StatisticsDisclosure>
  );
}

function RankerSection({ player, window }: { player: RankerPlayerStatistics; window: StatisticsWindow }) {
  const primary = rankerValues(player)[0];
  if (!primary) return null;
  return (
    <section className="border-t border-edge py-4" aria-labelledby="ranker-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <h2 id="ranker-heading" className="text-lg font-extrabold text-white">Ranker</h2>
        <p className="text-xs text-muted">{UnitTypeLabel[primary.unitType]} · {player.distinctEvents} events across types · {window}</p>
      </div>
      <MetricGrid values={[
        ["K", formatMetric(primary.stats.totals.kills)],
        ["D", formatMetric(primary.stats.totals.deaths)],
        ["A", formatMetric(primary.stats.totals.assists)],
        ["KDR", <StatisticsRatio key="ratio" ratio={primary.stats.killDeathRatio} />],
        ["Events", player.distinctEvents],
      ]} />
      <div className="mt-3">
        <RankerDetails player={player} />
      </div>
    </section>
  );
}

function CommanderTypeDetails({ player }: { player: CommanderPlayerStatistics }) {
  const types = typeOrder.flatMap((unitType) =>
    player.unitTypes.filter((stats) => stats.unitType === unitType).map((stats) => ({ unitType, stats })),
  );
  return (
    <div className="space-y-2">
      {types.map(({ unitType, stats }) => (
        <details key={unitType} className="border-b border-edge">
          <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 py-2 text-sm font-bold text-foreground outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
            <span>{UnitTypeLabel[unitType]}</span>
            <span className="text-xs font-normal text-muted">{stats.battlesCommanded} battles · KDR <StatisticsRatio ratio={stats.killDeathRatio} /></span>
          </summary>
          <div className="pb-3">
            <MetricGrid values={[
              ["K", formatMetric(stats.totals.kills)],
              ["D", formatMetric(stats.totals.deaths)],
              ["A", formatMetric(stats.totals.assists)],
              ["Tickets", formatMetric(stats.totals.tickets)],
              ["Captures", formatMetric(stats.totals.flagCaptures)],
              ["Losses", formatMetric(stats.totals.flagLosses)],
              ["Stars", formatMetric(stats.totals.stars)],
              ["Avg players", formatMetric(stats.averagesPerBattle.playerCount)],
              ["Avg KDR", <StatisticsRatio key="ratio" ratio={stats.averageKillDeathRatio} />],
            ]} />
            <div className="mt-2 text-xs text-muted">
              Per battle: K {formatMetric(stats.averagesPerBattle.kills)} · D {formatMetric(stats.averagesPerBattle.deaths)} · A {formatMetric(stats.averagesPerBattle.assists)} · Tickets {formatMetric(stats.averagesPerBattle.tickets)} · Captures {formatMetric(stats.averagesPerBattle.flagCaptures)} · Losses {formatMetric(stats.averagesPerBattle.flagLosses)} · Stars {formatMetric(stats.averagesPerBattle.stars)}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function CommanderSection({ player }: { player: CommanderPlayerStatistics }) {
  const primary = typeOrder.flatMap((unitType) => player.unitTypes.filter((stats) => stats.unitType === unitType))[0];
  if (!primary) return null;
  const typeCount = player.unitTypes.length;
  return (
    <StatisticsDisclosure
      title="Commander"
      summary={`${primary.battlesCommanded} ${UnitTypeLabel[primary.unitType]} battles · KDR ${primary.killDeathRatio.display} · ${formatMetric(primary.averagesPerBattle.playerCount)} avg players · ${typeCount} types`}
    >
      <CommanderTypeDetails player={player} />
    </StatisticsDisclosure>
  );
}

function GeneralTypeDetails({ player }: { player: GeneralPlayerStatistics }) {
  return (
    <>
      <MetricGrid values={typeOrder.map((unitType) => [UnitTypeLabel[unitType], player.atomicUnitsByType[unitType]])} />
      <div className="mt-2 space-y-2">
        {player.combatByType.map((stats) => (
          <details key={stats.unitType} className="border-b border-edge">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 py-2 text-sm font-bold text-foreground outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              <span>{UnitTypeLabel[stats.unitType]}</span>
              <span className="text-xs font-normal text-muted">{stats.atomicUnits} atomic units · KDR <StatisticsRatio ratio={stats.killDeathRatio} /></span>
            </summary>
            <div className="pb-3">
              <MetricGrid values={[
                ["K", formatMetric(stats.totals.kills)],
                ["D", formatMetric(stats.totals.deaths)],
                ["A", formatMetric(stats.totals.assists)],
                ["Tickets", formatMetric(stats.totals.tickets)],
                ["Captures", formatMetric(stats.totals.flagCaptures)],
                ["Losses", formatMetric(stats.totals.flagLosses)],
                ["Stars", formatMetric(stats.totals.stars)],
                ["Avg K/unit", formatMetric(stats.averagesPerAtomicUnit.kills)],
                ["Avg D/unit", formatMetric(stats.averagesPerAtomicUnit.deaths)],
                ["Avg A/unit", formatMetric(stats.averagesPerAtomicUnit.assists)],
                ["Avg tickets/unit", formatMetric(stats.averagesPerAtomicUnit.tickets)],
                ["Avg captures/unit", formatMetric(stats.averagesPerAtomicUnit.flagCaptures)],
                ["Avg losses/unit", formatMetric(stats.averagesPerAtomicUnit.flagLosses)],
                ["Avg stars/unit", formatMetric(stats.averagesPerAtomicUnit.stars)],
                ["Avg players/unit", formatMetric(stats.averagesPerAtomicUnit.playerCount)],
              ]} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

function GeneralSection({ player }: { player: GeneralPlayerStatistics }) {
  return (
    <StatisticsDisclosure
      title="General"
      summary={`${player.qualifyingGroupsCommanded} qualifying commands · ${player.distinctEventsCommanded} events · ${player.totalAtomicUnitsCommanded} atomic units`}
    >
      <GeneralTypeDetails player={player} />
    </StatisticsDisclosure>
  );
}

export function PlayerStatisticsSections({
  ranker,
  commander,
  general,
  window,
}: {
  ranker?: RankerPlayerStatistics;
  commander?: CommanderPlayerStatistics;
  general?: GeneralPlayerStatistics;
  window: StatisticsWindow;
}) {
  if (!ranker && !commander && !general) {
    return (
      <StatisticsEmptyState
        title="No statistics in this window"
        description="No Ranker, Commander, or General observations are available for the selected period."
      />
    );
  }

  return (
    <div className="mt-7">
      {ranker ? <RankerSection player={ranker} window={window} /> : null}
      {commander ? <CommanderSection player={commander} /> : null}
      {general ? <GeneralSection player={general} /> : null}
    </div>
  );
}