import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  eventTypeStyle,
  formatEventDateUTC,
} from "@/modules/events/presentation";
import type { PublicEventPresentation } from "@/modules/events/server/queries";
import type { PublicUnitPresentation } from "@/modules/units/server/public-presentation";

import { formatRatio } from "./leaderboard-model";
import {
  StatisticsRatio,
  UnitTypeLabel,
} from "./presentation";
import type {
  CommanderProfileEventRow,
  GeneralProfileCommandRow,
  PlayerProfileEventRow,
  PlayerProfileHistoryPage,
  PlayerProfileStatistics,
} from "./player-profile";
import type { PlayerProfileTab } from "./player-profile-filters";
import type { StatisticsWindow } from "./windows";

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/u, "");
}

function profileHref(
  gamePlayerId: string,
  window: StatisticsWindow,
  unitType: PlayerProfileStatistics["unitType"],
  pageParam: string,
  page: number,
): string {
  const query = new URLSearchParams({ window });
  if (unitType) query.set("type", unitType.toLowerCase());
  if (page > 1) query.set(pageParam, String(page));
  return `/players/${encodeURIComponent(gamePlayerId)}?${query.toString()}`;
}

function HistoryPagination<Row>({
  history,
  gamePlayerId,
  window,
  unitType,
  pageParam,
  label,
}: {
  history: PlayerProfileHistoryPage<Row>;
  gamePlayerId: string;
  window: StatisticsWindow;
  unitType: PlayerProfileStatistics["unitType"];
  pageParam: string;
  label: string;
}) {
  if (history.pageCount < 2) return null;

  const firstRow = (history.page - 1) * history.pageSize + 1;
  const lastRow = Math.min(history.page * history.pageSize, history.totalRows);
  return (
    <nav aria-label={`${label} pages`} className="flex flex-wrap items-center justify-between gap-3 border-t border-edge py-3 text-xs">
      <span className="tabular-nums text-muted">
        Showing {firstRow}–{lastRow} of {history.totalRows}
      </span>
      <div className="flex items-center gap-3">
        {history.page > 1 ? (
          <Link
            href={profileHref(gamePlayerId, window, unitType, pageParam, history.page - 1)}
            className="font-semibold text-gold underline decoration-edge-strong underline-offset-4 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Newer
          </Link>
        ) : null}
        <span aria-current="page" className="tabular-nums text-muted">
          Page {history.page} of {history.pageCount}
        </span>
        {history.page < history.pageCount ? (
          <Link
            href={profileHref(gamePlayerId, window, unitType, pageParam, history.page + 1)}
            className="font-semibold text-gold underline decoration-edge-strong underline-offset-4 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Older
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function UnitLink({
  unitId,
  fallbackName,
  unitsById,
}: {
  unitId: string;
  fallbackName?: string;
  unitsById: ReadonlyMap<string, PublicUnitPresentation>;
}) {
  const unit = unitsById.get(unitId);
  const name = unit?.name ?? fallbackName ?? `Unit ${unitId}`;
  if (!unitId) return <span className="text-muted">{name}</span>;

  return (
    <Link
      href={`/units/${encodeURIComponent(unitId)}`}
      aria-label={`View Unit ${name}`}
      title={name}
      className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-sm text-left font-semibold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-edge-strong bg-surface-2 text-[10px] font-bold text-muted">
        {unit?.imageRef ? (
          <Image
            src={unit.imageRef}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-full w-full object-contain"
          />
        ) : (
          <span aria-hidden="true">{name.slice(0, 1).toUpperCase() || "—"}</span>
        )}
      </span>
      <span className="min-w-0 truncate">{name}</span>
    </Link>
  );
}

function EventPill({
  eventId,
  occurredAt,
  eventsById,
}: {
  eventId: string;
  occurredAt: Date;
  eventsById: ReadonlyMap<string, PublicEventPresentation>;
}) {
  const event = eventsById.get(eventId);
  const type = event ? eventTypeStyle(event.eventType) : null;
  const eventName = event?.name ?? `Event ${eventId}`;

  return (
    <Link
      href={`/events/${encodeURIComponent(eventId)}`}
      aria-label={`View Event ${eventName}, ${formatEventDateUTC(occurredAt)}`}
      title={event?.map ? `${eventName} · ${event.map}` : eventName}
      className={`inline-flex min-w-0 max-w-full items-center gap-2 border border-edge border-l-2 bg-surface-2 px-2 py-1.5 transition-colors hover:border-edge-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${type?.barClass ?? "border-l-edge-strong"}`}
    >
      {type ? (
        <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${type.badgeClass}`}>
          {type.label}
        </span>
      ) : (
        <span className="shrink-0 rounded-sm border border-edge-strong px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
          Event
        </span>
      )}
      <span className="min-w-0 truncate text-xs font-bold text-foreground">{eventName}</span>
      {event?.map ? <span className="hidden shrink-0 text-[11px] text-muted xl:inline">{event.map}</span> : null}
      {event?.opponent ? <span className="hidden shrink-0 text-[11px] text-muted xl:inline">vs {event.opponent}</span> : null}
    </Link>
  );
}

function SummaryTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ key: string; values: string[] }>;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-y border-edge text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
              {headers.map((header, index) => (
                <th key={header} scope="col" className={index === 0 ? "py-2 pr-3 text-left" : "px-3 py-2 text-right"}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-edge/70">
                {row.values.map((value, index) => (
                  index === 0
                    ? <th key={`${row.key}-${index}`} scope="row" className="py-2 pr-3 text-left font-semibold text-foreground">{value}</th>
                    : <td key={`${row.key}-${index}`} className="px-3 py-2 text-right tabular-nums text-foreground">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="divide-y divide-edge border-y border-edge sm:hidden">
        {rows.map((row) => (
          <div key={row.key} className="py-2">
            <dt className="mb-2 text-xs font-bold text-foreground">{row.values[0]}</dt>
            <dd className="grid grid-cols-3 gap-x-3 gap-y-2">
              {headers.slice(1).map((header, index) => (
                <div key={`${row.key}-${header}`}>
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-muted">{header}</span>
                  <span className="mt-0.5 block text-sm tabular-nums text-foreground">{row.values[index + 1]}</span>
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function PlayerSummary({ statistics }: { statistics: PlayerProfileStatistics }) {
  if (statistics.playerSummary.length === 0) {
    return <p className="border-y border-edge py-3 text-sm text-muted">No Player activity during this timeframe.</p>;
  }

  return (
    <SummaryTable
      headers={["Unit type", "Audits", "K", "D", "A", "K/D", "(K+A)/D"]}
      rows={statistics.playerSummary.map((stats) => ({
        key: stats.unitType,
        values: [
          UnitTypeLabel[stats.unitType],
          formatMetric(stats.auditAppearances),
          formatMetric(stats.totals.kills),
          formatMetric(stats.totals.deaths),
          formatMetric(stats.totals.assists),
          formatRatio(stats.killDeathRatio),
          formatRatio(stats.killAssistDeathRatio),
        ],
      }))}
    />
  );
}

function CommanderSummary({ statistics }: { statistics: PlayerProfileStatistics }) {
  if (statistics.commanderSummary.length === 0) {
    return <p className="border-y border-edge py-3 text-sm text-muted">No Commander activity during this timeframe.</p>;
  }

  return (
    <SummaryTable
      headers={["Unit type", "Battles", "Players / battle", "K", "K/D", "Tickets", "FC", "FL", "Stars"]}
      rows={statistics.commanderSummary.map((stats) => ({
        key: stats.unitType,
        values: [
          UnitTypeLabel[stats.unitType],
          formatMetric(stats.battlesCommanded),
          formatMetric(stats.averagesPerBattle.playerCount),
          formatMetric(stats.totals.kills),
          formatRatio(stats.killDeathRatio),
          formatMetric(stats.totals.tickets),
          formatMetric(stats.totals.flagCaptures),
          formatMetric(stats.totals.flagLosses),
          formatMetric(stats.totals.stars),
        ],
      }))}
    />
  );
}

function GeneralSummary({ statistics }: { statistics: PlayerProfileStatistics }) {
  const summary = statistics.generalSummary;
  if (!summary) {
    return <p className="border-y border-edge py-3 text-sm text-muted">No General activity during this timeframe.</p>;
  }

  return (
    <div className="border-y border-edge">
      <dl className="grid grid-cols-2 gap-y-3 py-3 sm:grid-cols-3">
        {[
          ["Commands", summary.qualifyingGroupsCommanded],
          ["Events", summary.distinctEventsCommanded],
          ["Companies", summary.totalAtomicUnitsCommanded],
        ].map(([label, value]) => (
          <div key={label} className="border-l border-edge pl-3 first:border-l-0 first:pl-0">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <SummaryTable
        headers={["Company type", "Companies"]}
        rows={[
          ["REGULAR", "Regular"],
          ["RIFLES", "Rifles"],
          ["CAVALRY", "Cavalry"],
          ["ARTILLERY", "Artillery"],
        ].map(([unitType, label]) => ({
          key: unitType,
          values: [label, String(summary.atomicUnitsByType[unitType as keyof typeof summary.atomicUnitsByType])],
        }))}
      />
    </div>
  );
}

function HistoryHeading({ title }: { title: string }) {
  return <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</h3>;
}

function HistoryDate({ value }: { value: Date }) {
  return (
    <time dateTime={value.toISOString()} className="whitespace-nowrap text-xs font-semibold tabular-nums text-muted">
      {formatEventDateUTC(value)}
    </time>
  );
}

function PlayerHistory({
  history,
  statistics,
  eventsById,
  unitsById,
}: {
  history: PlayerProfileHistoryPage<PlayerProfileEventRow>;
  statistics: PlayerProfileStatistics;
  eventsById: ReadonlyMap<string, PublicEventPresentation>;
  unitsById: ReadonlyMap<string, PublicUnitPresentation>;
}) {
  if (history.totalRows === 0) {
    return <p className="py-3 text-sm text-muted">No Event performance during this timeframe.</p>;
  }
  return (
    <>
      <ol className="divide-y divide-edge border-y border-edge lg:hidden">
        {history.rows.map((row) => (
          <li key={row.auditId} className="space-y-2.5 py-3">
            <HistoryDate value={row.occurredAt} />
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <UnitLink unitId={row.unitId} fallbackName={row.unitName} unitsById={unitsById} />
              <EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} />
            </div>
            <dl className="grid grid-cols-5 gap-2 border-t border-edge/70 pt-2">
              {([
                ["K", row.kills],
                ["D", row.deaths],
                ["A", row.assists],
                ["K/D", <StatisticsRatio key="kd" ratio={row.killDeathRatio} />],
                ["(K+A)/D", <StatisticsRatio key="kad" ratio={row.killAssistDeathRatio} />],
              ] as [string, number | ReactNode][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{typeof value === "number" ? formatMetric(value) : value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[940px] border-y border-edge text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-3 text-left">Date</th>
              <th scope="col" className="px-3 py-2 text-left">Unit</th>
              <th scope="col" className="px-3 py-2 text-left">Event</th>
              {["K", "D", "A", "K/D", "(K+A)/D"].map((label) => <th key={label} scope="col" className="px-3 py-2 text-right">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => (
              <tr key={row.auditId} className="border-t border-edge/70 transition-colors hover:bg-surface-2/60">
                <th scope="row" className="py-2 pr-3 text-left font-normal"><HistoryDate value={row.occurredAt} /></th>
                <td className="px-3 py-2"><UnitLink unitId={row.unitId} fallbackName={row.unitName} unitsById={unitsById} /></td>
                <td className="px-3 py-2"><EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} /></td>
                {[row.kills, row.deaths, row.assists].map((value, index) => (
                  <td key={index} className="px-3 py-2 text-right tabular-nums">{formatMetric(value)}</td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums"><StatisticsRatio ratio={row.killDeathRatio} /></td>
                <td className="px-3 py-2 text-right tabular-nums"><StatisticsRatio ratio={row.killAssistDeathRatio} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HistoryPagination
        history={history}
        gamePlayerId={statistics.gamePlayerId}
        window={statistics.window}
        unitType={statistics.unitType}
        pageParam="playerPage"
        label="Player Event history"
      />
    </>
  );
}

function CommanderHistory({
  history,
  statistics,
  eventsById,
  unitsById,
}: {
  history: PlayerProfileHistoryPage<CommanderProfileEventRow>;
  statistics: PlayerProfileStatistics;
  eventsById: ReadonlyMap<string, PublicEventPresentation>;
  unitsById: ReadonlyMap<string, PublicUnitPresentation>;
}) {
  if (history.totalRows === 0) {
    return <p className="py-3 text-sm text-muted">No Commander Event performance during this timeframe.</p>;
  }
  return (
    <>
      <ol className="divide-y divide-edge border-y border-edge lg:hidden">
        {history.rows.map((row) => (
          <li key={row.auditId} className="space-y-2.5 py-3">
            <HistoryDate value={row.occurredAt} />
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <UnitLink unitId={row.unitId} fallbackName={row.unitName} unitsById={unitsById} />
              <EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} />
            </div>
            <dl className="grid grid-cols-4 gap-2 border-t border-edge/70 pt-2 sm:grid-cols-7">
              {([
                ["Players", row.players],
                ["K", row.kills],
                ["K/D", <StatisticsRatio key="kd" ratio={row.killDeathRatio} />],
                ["Tickets", row.tickets],
                ["FC", row.flagCaptures],
                ["FL", row.flagLosses],
                ["Stars", row.stars],
              ] as [string, number | ReactNode][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{typeof value === "number" ? formatMetric(value) : value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1020px] border-y border-edge text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-3 text-left">Date</th>
              <th scope="col" className="px-3 py-2 text-left">Unit</th>
              <th scope="col" className="px-3 py-2 text-left">Event</th>
              {["Players", "K", "K/D", "Tickets", "FC", "FL", "Stars"].map((label) => <th key={label} scope="col" className="px-3 py-2 text-right">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => (
              <tr key={row.auditId} className="border-t border-edge/70 transition-colors hover:bg-surface-2/60">
                <th scope="row" className="py-2 pr-3 text-left font-normal"><HistoryDate value={row.occurredAt} /></th>
                <td className="px-3 py-2"><UnitLink unitId={row.unitId} fallbackName={row.unitName} unitsById={unitsById} /></td>
                <td className="px-3 py-2"><EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{row.players}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMetric(row.kills)}</td>
                <td className="px-3 py-2 text-right tabular-nums"><StatisticsRatio ratio={row.killDeathRatio} /></td>
                {[row.tickets, row.flagCaptures, row.flagLosses, row.stars].map((value, index) => (
                  <td key={index} className="px-3 py-2 text-right tabular-nums">{formatMetric(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HistoryPagination
        history={history}
        gamePlayerId={statistics.gamePlayerId}
        window={statistics.window}
        unitType={statistics.unitType}
        pageParam="commanderPage"
        label="Commander Event history"
      />
    </>
  );
}

function GeneralHistory({
  history,
  statistics,
  eventsById,
  unitsById,
}: {
  history: PlayerProfileHistoryPage<GeneralProfileCommandRow>;
  statistics: PlayerProfileStatistics;
  eventsById: ReadonlyMap<string, PublicEventPresentation>;
  unitsById: ReadonlyMap<string, PublicUnitPresentation>;
}) {
  if (history.totalRows === 0) {
    return <p className="py-3 text-sm text-muted">No General command history during this timeframe.</p>;
  }
  return (
    <>
      <ol className="divide-y divide-edge border-y border-edge lg:hidden">
        {history.rows.map((row) => (
          <li key={row.groupId} className="space-y-2.5 py-3">
            <HistoryDate value={row.occurredAt} />
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <UnitLink unitId={row.unitId} unitsById={unitsById} />
              {row.side ? <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{row.side}</span> : null}
              <EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} />
            </div>
            <dl className="grid grid-cols-5 gap-2 border-t border-edge/70 pt-2">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wide text-muted">Companies</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{row.companies}</dd>
              </div>
              {[
                ["Regular", row.companiesByType.REGULAR],
                ["Rifles", row.companiesByType.RIFLES],
                ["Cavalry", row.companiesByType.CAVALRY],
                ["Artillery", row.companiesByType.ARTILLERY],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[940px] border-y border-edge text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-3 text-left">Date</th>
              <th scope="col" className="px-3 py-2 text-left">Command</th>
              <th scope="col" className="px-3 py-2 text-left">Event</th>
              {["Companies", "Regular", "Rifles", "Cavalry", "Artillery"].map((label) => <th key={label} scope="col" className="px-3 py-2 text-right">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => (
              <tr key={row.groupId} className="border-t border-edge/70 transition-colors hover:bg-surface-2/60">
                <th scope="row" className="py-2 pr-3 text-left font-normal"><HistoryDate value={row.occurredAt} /></th>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <UnitLink unitId={row.unitId} unitsById={unitsById} />
                    {row.side ? <span className="text-[9px] font-bold uppercase tracking-wide text-muted">{row.side}</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2"><EventPill eventId={row.eventId} occurredAt={row.occurredAt} eventsById={eventsById} /></td>
                {[row.companies, row.companiesByType.REGULAR, row.companiesByType.RIFLES, row.companiesByType.CAVALRY, row.companiesByType.ARTILLERY].map((value, index) => (
                  <td key={index} className="px-3 py-2 text-right tabular-nums">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HistoryPagination
        history={history}
        gamePlayerId={statistics.gamePlayerId}
        window={statistics.window}
        unitType={null}
        pageParam="generalPage"
        label="General command history"
      />
    </>
  );
}

export function PlayerStatisticsSections({
  tab,
  statistics,
  events,
  units,
}: {
  tab: PlayerProfileTab;
  statistics: PlayerProfileStatistics;
  events: PublicEventPresentation[];
  units: PublicUnitPresentation[];
}) {
  const eventsById = new Map(events.map((event) => [event.eventId, event]));
  const unitsById = new Map(units.map((unit) => [unit.unitId, unit]));

  return (
    <div className="mt-5">
      {tab === "ranker" ? <section aria-labelledby="player-performance-heading" className="border-t border-edge pt-5">
        <h2 id="player-performance-heading" className="text-xl font-extrabold tracking-tight text-white">Ranker Performance</h2>
        <p className="mt-1 text-xs text-muted">Summary remains partitioned by Unit type to preserve Ranker semantics.</p>
        <div className="mt-3"><PlayerSummary statistics={statistics} /></div>
        <HistoryHeading title="Event Performance" />
        <PlayerHistory history={statistics.playerHistory} statistics={statistics} eventsById={eventsById} unitsById={unitsById} />
      </section> : null}

      {tab === "commander" ? <section aria-labelledby="commander-performance-heading" className="border-t border-edge pt-5">
        <h2 id="commander-performance-heading" className="text-xl font-extrabold tracking-tight text-white">Commander Performance</h2>
        <div className="mt-3"><CommanderSummary statistics={statistics} /></div>
        <HistoryHeading title="Commander Event Performance" />
        <CommanderHistory history={statistics.commanderHistory} statistics={statistics} eventsById={eventsById} unitsById={unitsById} />
      </section> : null}

      {tab === "general" ? <section aria-labelledby="general-performance-heading" className="border-t border-edge pt-5">
        <h2 id="general-performance-heading" className="text-xl font-extrabold tracking-tight text-white">General Performance</h2>
        <div className="mt-3"><GeneralSummary statistics={statistics} /></div>
        <HistoryHeading title="General Command History · all Unit types" />
        <GeneralHistory history={statistics.generalHistory} statistics={statistics} eventsById={eventsById} unitsById={unitsById} />
      </section> : null}
    </div>
  );
}
