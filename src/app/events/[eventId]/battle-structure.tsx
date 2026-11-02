import Image from "next/image";
import Link from "next/link";

import type {
  EventBattleAtomicUnit,
  EventBattleGroup,
  EventBattleSide,
  EventBattleSideSummary,
} from "@/modules/statistics/event-battle";
import type { RatioMetric } from "@/modules/statistics/ratios";

type IconName =
  | "attacker"
  | "assists"
  | "commander"
  | "company"
  | "defender"
  | "deaths"
  | "flag"
  | "group"
  | "kills"
  | "players"
  | "result"
  | "star"
  | "status"
  | "tickets";

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {name === "attacker" ? <><path d="m5 19 14-14" /><path d="M13 5h6v6" /></> : null}
      {name === "assists" ? <><circle cx="9" cy="8" r="3" /><path d="M3 20c.4-3 2.4-5 6-5" /><path d="m15 12 2 2 4-4" /></> : null}
      {name === "commander" ? <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.2 3.2-5 7-5s6.5 1.8 7 5" /></> : null}
      {name === "company" ? <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8v8H8z" /></> : null}
      {name === "defender" ? <path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z" /> : null}
      {name === "deaths" ? <><circle cx="12" cy="10" r="7" /><circle cx="9.5" cy="10" r="1" fill="currentColor" /><circle cx="14.5" cy="10" r="1" fill="currentColor" /><path d="M9 15h6m-4-2v2m2-2v2M8 20h8" /></> : null}
      {name === "flag" ? <><path d="M5 21V4" /><path d="M5 5c5-3 9 3 14 0v10c-5 3-9-3-14 0" /></> : null}
      {name === "group" ? <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><path d="M7.5 11v3h9v-3M12 14v5M9 19h6" /></> : null}
      {name === "kills" ? <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></> : null}
      {name === "players" ? <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5" /><path d="M16 5.5a3 3 0 0 1 0 5.8m2 3c1.8.8 2.7 2.5 3 4.7" /></> : null}
      {name === "result" ? <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></> : null}
      {name === "star" ? <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /> : null}
      {name === "status" ? <circle cx="12" cy="12" r="8" /> : null}
      {name === "tickets" ? <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z" /><path d="M12 8v2m0 4v2" /></> : null}
    </svg>
  );
}

function ratioDisplay(value: RatioMetric) {
  return value.state === "RATIO" ? `${value.value.toFixed(2)} K/D` : value.display;
}

function unitName(unit: EventBattleAtomicUnit) {
  return unit.name?.trim() || unit.persistentUnitName;
}

function UnitMark({
  name,
  imageRef,
}: {
  name: string;
  imageRef: string | null;
}) {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-edge-strong bg-surface-2 text-muted"
      role="img"
      aria-label={`${name} Unit icon`}
    >
      {imageRef ? (
        <Image src={imageRef} alt="" fill sizes="36px" unoptimized className="object-contain p-0.5" />
      ) : (
        <Icon name="company" className="h-4 w-4" />
      )}
    </span>
  );
}

function UnitReference({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const label = name.trim() || "Unit not available";
  const className = "min-w-0 break-words text-xs font-medium text-body-soft underline decoration-edge-strong underline-offset-2 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

  return id ? (
    <Link href={`/units/${encodeURIComponent(id)}`} className={className}>
      {label}
    </Link>
  ) : (
    <span className="min-w-0 break-words text-xs text-muted">{label}</span>
  );
}

function PlayerReference({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/players/${encodeURIComponent(id)}`}
      className={className ?? "break-words text-body-soft underline decoration-edge-strong underline-offset-2 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"}
    >
      {name}
    </Link>
  );
}

function AuditTypeLabel({ value }: { value: string }) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatMetric(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function atomicUnitsInGroups(groups: EventBattleGroup[]): EventBattleAtomicUnit[] {
  return groups.flatMap((group) => [
    ...group.atomicUnits,
    ...atomicUnitsInGroups(group.children),
  ]);
}

function SideSummaryCard({
  side,
  summary,
}: {
  side: EventBattleSide;
  summary: EventBattleSideSummary | null;
}) {
  const label = side === "ATTACKER" ? "Attackers" : "Defenders";
  const metrics = [
    { label: "Tickets", value: summary ? String(summary.tickets) : "—", primary: true },
    { label: "K/D", value: summary ? ratioDisplay(summary.kdr) : "—", primary: false },
    { label: "Flag Captures", value: summary ? String(summary.flagCaptures) : "—", primary: false },
  ];

  return (
    <section className="min-w-0 rounded-xl border border-edge bg-surface px-4 py-3" aria-label={`${label} summary`}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{label}</h3>
      <dl className="mt-2 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-faint">{metric.label}</dt>
            <dd className={`mt-0.5 whitespace-nowrap font-bold tabular-nums text-foreground ${metric.primary ? "text-2xl" : "text-lg"}`}>
              {metric.value}
            </dd>
            {metric.label === "K/D" && summary ? (
              <span className="text-[10px] text-muted">pooled kills ÷ deaths</span>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function LeaderboardMetric({
  value,
  average,
  label,
}: {
  value: number | null;
  average?: number | null;
  label: string;
}) {
  if (value === null) return <span className="text-muted">—</span>;
  return (
    <span
      className="inline-flex flex-col tabular-nums"
      aria-label={`${label}: ${value}${average == null ? "" : `, average ${average} per finalized Player appearance`}`}
    >
      <span>{formatMetric(value)}</span>
      {average != null ? (
        <span className="whitespace-nowrap text-[10px] text-muted">avg {formatMetric(average)} / player</span>
      ) : null}
    </span>
  );
}

export function PublicEventStatistics({
  groups,
  ungroupedAtomicUnits,
  sideSummaries,
}: {
  groups: EventBattleGroup[];
  ungroupedAtomicUnits: EventBattleAtomicUnit[];
  sideSummaries: Record<EventBattleSide, EventBattleSideSummary | null>;
}) {
  const companies = [
    ...ungroupedAtomicUnits,
    ...atomicUnitsInGroups(groups),
  ];

  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="event-statistics-heading">
      <div className="flex items-center justify-between border-b border-edge pb-2">
        <h2 id="event-statistics-heading" className="text-lg font-extrabold text-white">Event Statistics</h2>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <SideSummaryCard side="ATTACKER" summary={sideSummaries.ATTACKER} />
        <SideSummaryCard side="DEFENDER" summary={sideSummaries.DEFENDER} />
      </div>
      {companies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge-strong px-3 py-3 text-sm text-muted">
          No participating Companies are available for the Unit leaderboard.
        </p>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border border-edge">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <caption className="sr-only">
              Unit results. Average Kills, Deaths, and Assists are per finalized Player appearance, including appearances with zero values.
            </caption>
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2.5">Unit</th>
                <th scope="col" className="px-3 py-2.5">Side</th>
                <th scope="col" className="px-3 py-2.5">Player Count</th>
                <th scope="col" className="px-3 py-2.5">Kills</th>
                <th scope="col" className="px-3 py-2.5">Deaths</th>
                <th scope="col" className="px-3 py-2.5">Assists</th>
                <th scope="col" className="px-3 py-2.5">K/D</th>
                <th scope="col" className="px-3 py-2.5">Flag Captures</th>
                <th scope="col" className="px-3 py-2.5">Flag Losses</th>
                <th scope="col" className="px-3 py-2.5">Stars</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/70">
              {companies.map((unit) => {
                const summary = unit.summary;
                return (
                  <tr key={unit.id} className="text-body-soft">
                    <th scope="row" className="min-w-40 px-3 py-2.5 font-semibold text-foreground">
                      <span className="block">{unitName(unit)}</span>
                      {summary === null ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-muted">
                          {unit.resultState === "PENDING" ? "Results pending" : "Statistics unavailable"}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2.5">{unit.side === "ATTACKER" ? "Attacker" : "Defender"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{summary?.playerCount ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <LeaderboardMetric value={summary?.kills ?? null} average={summary?.averagesPerPlayer?.kills} label="Kills" />
                    </td>
                    <td className="px-3 py-2.5">
                      <LeaderboardMetric value={summary?.deaths ?? null} average={summary?.averagesPerPlayer?.deaths} label="Deaths" />
                    </td>
                    <td className="px-3 py-2.5">
                      <LeaderboardMetric value={summary?.assists ?? null} average={summary?.averagesPerPlayer?.assists} label="Assists" />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{summary ? ratioDisplay(summary.kdr) : "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{summary?.flagCaptures ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{summary?.flagLosses ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{summary?.stars ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlayerResults({ unit }: { unit: EventBattleAtomicUnit }) {
  if (unit.resultState === "PENDING") {
    return <p className="text-xs text-muted">Player results are pending.</p>;
  }
  if (unit.players.length === 0) {
    return <p className="text-xs text-muted">No player results are available.</p>;
  }

  return (
    <ul className="grid min-w-0 gap-1">
      {unit.players.map((player) => (
        <li
          key={player.playerId}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-center gap-x-2 border-t border-edge/70 py-1.5 text-xs"
        >
          <span className="flex min-w-0 flex-col">
            <PlayerReference id={player.playerId} name={player.displayName} className="min-w-0 break-words font-medium text-body-soft underline decoration-edge-strong underline-offset-2 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" />
            {player.role ? (
              <span className="text-[10px] text-muted">
                {player.role === "COMMANDER" ? "Commander" : "Flag Bearer"}
              </span>
            ) : null}
          </span>
          <span aria-label={`${player.kills} kills`} className="whitespace-nowrap tabular-nums text-muted">{player.kills} K</span>
          <span aria-label={`${player.deaths} deaths`} className="whitespace-nowrap tabular-nums text-muted">{player.deaths} D</span>
          <span aria-label={`${player.assists} assists`} className="whitespace-nowrap tabular-nums text-muted">{player.assists} A</span>
          <span aria-label={`K/D ${ratioDisplay(player.kdr)}`} className="whitespace-nowrap tabular-nums text-muted">{ratioDisplay(player.kdr)}</span>
        </li>
      ))}
    </ul>
  );
}

function PublicCompany({
  unit,
  unitImageRefs,
}: {
  unit: EventBattleAtomicUnit;
  unitImageRefs: Record<string, string | null>;
}) {
  const representedName = unit.representedUnitName || unit.persistentUnitName;
  const commander = unit.players.find((player) => player.role === "COMMANDER");
  const statusLabel = unit.resultState === "PENDING"
    ? "Results pending"
    : unit.summary === null
      ? "Statistics unavailable"
      : "Finalized";

  return (
    <li className="min-w-0 rounded-xl border border-edge-strong bg-background/75 p-2.5 sm:p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <UnitMark name={representedName} imageRef={unitImageRefs[unit.representedUnitId] ?? null} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Icon name="company" className="h-3.5 w-3.5 shrink-0 text-muted" />
            <h4 className="min-w-0 break-words text-sm font-bold text-foreground">{unitName(unit)}</h4>
            <span className="rounded-full border border-edge-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-body-soft">
              Company
            </span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Unit</span>
            <UnitReference id={unit.representedUnitId} name={representedName} />
            {unit.auditUnitType ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-body-soft">
                {AuditTypeLabel({ value: unit.auditUnitType })}
              </span>
            ) : null}
            {unit.isMandatory ? (
              <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-medium text-gold">Mandatory</span>
            ) : null}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {commander ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Icon name="commander" className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="text-muted">Commander</span>
                <PlayerReference id={commander.playerId} name={unit.commander ?? commander.displayName} />
              </span>
            ) : (
              <span className="inline-flex min-w-0 items-center gap-1 text-muted">
                <Icon name="commander" className="h-3.5 w-3.5 shrink-0" />
                {unit.resultState === "PENDING" ? "Commander pending Audit" : "No Audit commander recorded"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-muted">
              <Icon
                name={unit.resultState === "FINALIZED" && unit.summary ? "result" : "status"}
                className="h-3.5 w-3.5 shrink-0"
              />
              {statusLabel}
            </span>
          </div>
          <details className="mt-2 border-t border-edge pt-2">
            <summary className="w-fit cursor-pointer rounded text-xs font-semibold text-gold underline decoration-edge-strong underline-offset-2 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              Participating Players
            </summary>
            <div className="mt-3 grid min-w-0 gap-4">
              <section className="grid min-w-0 gap-2" aria-label="Participating players">
                <h5 className="text-xs font-bold text-foreground">Participating Players</h5>
                <PlayerResults unit={unit} />
              </section>
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}

function companyCount(group: EventBattleGroup): number {
  return group.atomicUnits.length + group.children.reduce((total, child) => total + companyCount(child), 0);
}

function groupCount(group: EventBattleGroup): number {
  return 1 + group.children.reduce((total, child) => total + groupCount(child), 0);
}

function PublicGroup({
  group,
  unitImageRefs,
}: {
  group: EventBattleGroup;
  unitImageRefs: Record<string, string | null>;
}) {
  const companies = companyCount(group);
  const childrenExist = group.atomicUnits.length + group.children.length > 0;

  return (
    <li className="min-w-0 rounded-xl border border-edge-strong bg-surface p-2 sm:p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Icon name="group" className="h-4 w-4 shrink-0 text-gold" />
        <h4 className="min-w-0 break-words text-sm font-bold text-foreground">{group.name}</h4>
        <span className="rounded-full border border-gold/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
          Command Group
        </span>
        <span className="rounded-full border border-edge-strong px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
          {companies} {companies === 1 ? "Company" : "Companies"}
        </span>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pl-1 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <UnitMark
            name={group.representedUnit.name}
            imageRef={unitImageRefs[group.representedUnit.id] ?? null}
          />
          <span className="text-muted">Unit</span>
          <UnitReference id={group.representedUnit.id} name={group.representedUnit.name} />
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <Icon name="commander" className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="text-muted">Group commander</span>
          <PlayerReference id={group.commanderPlayerId} name={group.commanderPlayerId} />
        </span>
      </div>
      {childrenExist ? (
        <details open className="mt-2 border-t border-edge pt-2">
          <summary className="w-fit cursor-pointer rounded text-xs font-semibold text-body-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Companies and child Command Groups
          </summary>
          <ul className="mt-2 grid min-w-0 list-none gap-2 pl-1">
            {group.atomicUnits.map((unit) => (
              <PublicCompany key={unit.id} unit={unit} unitImageRefs={unitImageRefs} />
            ))}
            {group.children.map((child) => (
              <PublicGroup key={child.id} group={child} unitImageRefs={unitImageRefs} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-edge-strong px-2.5 py-2 text-xs text-muted">
          This Command Group has no Companies or child Command Groups.
        </p>
      )}
    </li>
  );
}

function SideColumn({
  label,
  side,
  flagRef,
  groups,
  companies,
  unitImageRefs,
  result,
}: {
  label: string;
  side: "ATTACKER" | "DEFENDER";
  flagRef: string | null;
  groups: EventBattleGroup[];
  companies: EventBattleAtomicUnit[];
  unitImageRefs: Record<string, string | null>;
  result: string | null;
}) {
  const isDefender = side === "DEFENDER";
  const groupTotal = groups.reduce((total, group) => total + groupCount(group), 0);
  const companyTotal = companies.length + groups.reduce((total, group) => total + companyCount(group), 0);
  const resultLabel = result === null
    ? null
    : result === "DRAW"
      ? "Draw"
      : result === `${side}_WIN`
        ? "Winner"
        : "Loss";
  const resultSurfaceClass = result === null
    ? "border-edge bg-surface/60"
    : result === "DRAW"
      ? "border-white/25 bg-gradient-to-br from-white/[0.12] via-surface/75 to-surface/60"
      : resultLabel === "Winner"
        ? "border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.12] via-surface/75 to-surface/60"
        : "border-rose-500/35 bg-gradient-to-br from-rose-500/[0.11] via-surface/75 to-surface/60";
  const resultBadgeClass = result === null
    ? ""
    : result === "DRAW"
      ? "border-white/25 bg-white/[0.08] text-foreground"
      : resultLabel === "Winner"
        ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
        : "border-rose-400/30 bg-rose-500/[0.08] text-rose-200";

  return (
    <section
      id={`battle-${side.toLowerCase()}s`}
      className={`min-w-0 rounded-xl border p-3 sm:p-3.5 ${resultSurfaceClass} ${isDefender ? "border-t-2 border-t-type-blue/50" : "border-t-2 border-t-type-red/50"}`}
      data-outcome={resultLabel?.toLowerCase()}
      aria-labelledby={`${side.toLowerCase()}-heading`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {flagRef ? (
            <Image
              src={flagRef}
              alt={`${label} flag`}
              width={40}
              height={28}
              unoptimized
              className="h-7 w-10 shrink-0 rounded border border-edge object-cover"
            />
          ) : (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-edge-strong bg-background ${isDefender ? "text-type-blue" : "text-type-red"}`}>
              <Icon name={isDefender ? "defender" : "attacker"} />
            </span>
          )}
          <div className="min-w-0">
            <h3 id={`${side.toLowerCase()}-heading`} className="text-sm font-extrabold uppercase tracking-wide text-foreground">
              {label}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {companyTotal} {companyTotal === 1 ? "Company" : "Companies"}
              <span className="mx-1.5 text-faint">·</span>
              {groupTotal} {groupTotal === 1 ? "Command Group" : "Command Groups"}
            </p>
          </div>
        </div>
        {resultLabel ? (
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${resultBadgeClass}`}>
            {resultLabel}
          </span>
        ) : null}
      </div>
      {groups.length + companies.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-edge-strong px-3 py-3 text-xs text-muted">
          No Companies or Command Groups are assigned to this side.
        </p>
      ) : (
        <ul className="mt-3 grid min-w-0 list-none gap-2">
          {groups.map((group) => (
            <PublicGroup key={group.id} group={group} unitImageRefs={unitImageRefs} />
          ))}
          {companies.map((unit) => (
            <PublicCompany key={unit.id} unit={unit} unitImageRefs={unitImageRefs} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function PublicBattleStructure({
  result,
  defenderFlagRef,
  attackerFlagRef,
  groups,
  ungroupedAtomicUnits,
  unitImageRefs = {},
}: {
  result: string | null;
  defenderFlagRef: string | null;
  attackerFlagRef: string | null;
  groups: EventBattleGroup[];
  ungroupedAtomicUnits: EventBattleAtomicUnit[];
  unitImageRefs?: Record<string, string | null>;
}) {
  const defenderGroups = groups.filter((group) => group.side === "DEFENDER");
  const attackerGroups = groups.filter((group) => group.side === "ATTACKER");
  const defenderUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "DEFENDER");
  const attackerUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "ATTACKER");
  const hasAssignedNodes = defenderGroups.length + attackerGroups.length + defenderUnits.length + attackerUnits.length > 0;
  const resultLabel = result === "DEFENDER_WIN"
    ? "Defenders won"
    : result === "ATTACKER_WIN"
      ? "Attackers won"
      : result === "DRAW"
        ? "Draw"
        : null;

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="battle-structure-heading">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
        <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
        {resultLabel ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Icon name="flag" className="h-4 w-4" />
            Event result: <strong className="font-semibold text-foreground">{resultLabel}</strong>
          </p>
        ) : null}
      </div>
      {!hasAssignedNodes ? (
        <p className="rounded-lg border border-dashed border-edge-strong px-3 py-3 text-sm text-muted">
          Battle sides not configured.
        </p>
      ) : (
        <>
          <nav aria-label="Battle Structure sides" className="flex flex-wrap gap-2">
            <Link href="#battle-attackers" className="rounded-md border border-edge-strong px-3 py-1.5 text-xs font-semibold text-body-soft hover:border-type-red/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <Icon name="attacker" className="mr-1.5 inline h-3.5 w-3.5" />Jump to Attackers
            </Link>
            <Link href="#battle-defenders" className="rounded-md border border-edge-strong px-3 py-1.5 text-xs font-semibold text-body-soft hover:border-type-blue/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <Icon name="defender" className="mr-1.5 inline h-3.5 w-3.5" />Jump to Defenders
            </Link>
          </nav>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <SideColumn
              label="Attackers"
              side="ATTACKER"
              flagRef={attackerFlagRef}
              groups={attackerGroups}
              companies={attackerUnits}
              unitImageRefs={unitImageRefs}
              result={result}
            />
            <SideColumn
              label="Defenders"
              side="DEFENDER"
              flagRef={defenderFlagRef}
              groups={defenderGroups}
              companies={defenderUnits}
              unitImageRefs={unitImageRefs}
              result={result}
            />
          </div>
        </>
      )}
    </section>
  );
}
