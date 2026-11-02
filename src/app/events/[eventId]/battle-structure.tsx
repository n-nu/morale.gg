import Image from "next/image";
import Link from "next/link";

import type { EventBattleAtomicUnit, EventBattleGroup } from "@/modules/statistics/event-battle";
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | number;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-body-soft">
      <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function AuditTypeLabel({ value }: { value: string }) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function CompanyStatistics({
  unit,
}: {
  unit: EventBattleAtomicUnit;
}) {
  if (unit.resultState !== "FINALIZED" || unit.summary === null) {
    return (
      <p className="text-xs text-muted">
        {unit.resultState === "PENDING" ? "Results are pending." : "Statistics are unavailable."}
      </p>
    );
  }

  const { summary } = unit;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 rounded-lg border border-edge-strong bg-surface px-2.5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">K/D</span>
          <span className="text-base font-bold tabular-nums text-foreground">{ratioDisplay(summary.kdr)}</span>
        </div>
        {summary.tickets !== null ? (
          <div className="flex flex-col gap-1 rounded-lg border border-edge-strong bg-surface px-2.5 py-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              <Icon name="tickets" className="h-3 w-3" /> Tickets
            </span>
            <span className="text-base font-bold tabular-nums text-foreground">{summary.tickets}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        <Metric icon="kills" label="Kills" value={summary.kills} />
        <Metric icon="deaths" label="Deaths" value={summary.deaths} />
        <Metric icon="assists" label="Assists" value={summary.assists} />
        <Metric icon="players" label={unit.players.length === 1 ? "Player" : "Players"} value={unit.players.length} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {summary.flagCaptures !== null ? <Metric icon="flag" label="Captures" value={summary.flagCaptures} /> : null}
        {summary.flagLosses !== null ? <Metric icon="flag" label="Losses" value={summary.flagLosses} /> : null}
        {summary.stars !== null ? <Metric icon="star" label={summary.stars === 1 ? "Star" : "Stars"} value={summary.stars} /> : null}
      </div>
    </div>
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
          {unit.resultState === "FINALIZED" && unit.summary ? (
            <div className="mt-3 border-t border-edge pt-2.5">
              <CompanyStatistics unit={unit} />
            </div>
          ) : null}
          <details className="mt-2 border-t border-edge pt-2">
            <summary className="w-fit cursor-pointer rounded text-xs font-semibold text-gold underline decoration-edge-strong underline-offset-2 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              Company statistics and participating players
            </summary>
            <div className="mt-3 grid min-w-0 gap-4">
              <section className="grid min-w-0 gap-2" aria-label="Company statistics">
                <h5 className="text-xs font-bold text-foreground">Company Statistics</h5>
                <CompanyStatistics unit={unit} />
              </section>
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

  return (
    <section
      id={`battle-${side.toLowerCase()}s`}
      className={`min-w-0 rounded-xl border border-edge bg-surface/60 p-3 sm:p-3.5 ${isDefender ? "border-t-2 border-t-type-blue/50" : "border-t-2 border-t-type-red/50"}`}
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
          <span className="shrink-0 rounded-full border border-edge-strong px-2 py-1 text-[10px] font-semibold text-body-soft">
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
        : "Not recorded";

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="battle-structure-heading">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
        <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Icon name={result === null ? "status" : "flag"} className="h-4 w-4" />
          Event result: <strong className="font-semibold text-foreground">{resultLabel}</strong>
        </p>
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
