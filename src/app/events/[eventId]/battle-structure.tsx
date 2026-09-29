import Image from "next/image";

import type { EventBattleAtomicUnit, EventBattleGroup } from "@/modules/statistics/event-battle";
import type { RatioMetric } from "@/modules/statistics/ratios";

function ratioDisplay(value: RatioMetric) {
  return value.state === "RATIO" ? `${value.value.toFixed(2)} KDR` : value.display;
}

function CompactMetrics({ summary }: { summary: NonNullable<EventBattleAtomicUnit["summary"]> }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-body-soft">
    <span>{summary.kills} K</span>
    <span>{summary.deaths} D</span>
    <span>{summary.assists} A</span>
    <span>{ratioDisplay(summary.kdr)}</span>
  </div>;
}

function PublicAtomicNode({ unit }: { unit: EventBattleAtomicUnit }) {
  return (
    <li className="border-l border-edge py-1 pl-3">
      <div className="text-sm font-medium text-body-soft">{unit.name ?? unit.persistentUnitName}</div>
      <div className="text-xs text-muted">{unit.representedUnitName}{unit.auditUnitType ? ` · ${unit.auditUnitType.toLowerCase()}` : ""}{unit.isMandatory ? " · Mandatory" : ""}</div>
      {unit.resultState === "FINALIZED" && unit.summary ? <>
        {unit.commander ? <div className="text-xs text-muted">Cmdr. {unit.commander}</div> : null}
        <CompactMetrics summary={unit.summary} />
      </> : <div className="text-xs text-muted">Results pending</div>}
      <details className="mt-1">
        <summary className="w-fit cursor-pointer text-xs text-gold hover:text-gold-bright">Battle details</summary>
        <div className="mt-2 grid grid-cols-1 gap-2 border-l border-edge pl-3 text-xs">
          {unit.summary ? <div>
            <div className="font-semibold text-foreground">Unit Statistics</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-muted sm:grid-cols-4">
              <span>{unit.summary.kills} K</span><span>{unit.summary.deaths} D</span><span>{unit.summary.assists} A</span><span>{ratioDisplay(unit.summary.kdr)}</span>
              {unit.summary.tickets !== null ? <span>{unit.summary.tickets} Tickets</span> : null}
              {unit.summary.flagCaptures !== null ? <span>{unit.summary.flagCaptures} Flag Captures</span> : null}
              {unit.summary.flagLosses !== null ? <span>{unit.summary.flagLosses} Flag Losses</span> : null}
              {unit.summary.stars !== null ? <span>{unit.summary.stars} Stars</span> : null}
            </div>
          </div> : <div><div className="font-semibold text-foreground">Unit Statistics</div><div className="text-muted">Results pending</div></div>}
          <div>
            <div className="font-semibold text-foreground">Participating Players</div>
            {unit.players.length === 0 ? <div className="text-muted">Results pending</div> : <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="text-muted"><tr><th className="pr-3 font-medium">Position</th><th className="pr-3 font-medium">Player</th><th className="pr-3 font-medium">K</th><th className="pr-3 font-medium">D</th><th className="pr-3 font-medium">A</th><th className="font-medium">KDR</th></tr></thead>
                <tbody>{unit.players.map((player) => <tr key={player.playerId} className="border-t border-edge/60"><td className="py-1 pr-3 text-muted">{player.role === "COMMANDER" ? "Commander" : player.role === "FLAG_BEARER" ? "Flag Bearer" : "-"}</td><td className="py-1 pr-3 text-body-soft">{player.displayName}</td><td className="pr-3">{player.kills}</td><td className="pr-3">{player.deaths}</td><td className="pr-3">{player.assists}</td><td>{ratioDisplay(player.kdr)}</td></tr>)}</tbody>
              </table>
            </div>}
          </div>
        </div>
      </details>
    </li>
  );
}

function PublicGroupNode({ group }: { group: EventBattleGroup }) {
  return (
    <li className="border-l border-edge pl-4">
      <details open className="py-1">
        <summary className="cursor-pointer text-sm font-semibold text-white">{group.name}</summary>
        <div className="ml-2 border-l border-edge pl-3">
          <div className="py-1 text-xs text-muted">{group.representedUnit.name} · Commander {group.commanderPlayerId}</div>
          {group.atomicUnits.length > 0 ? <ul>{group.atomicUnits.map((unit) => <PublicAtomicNode key={unit.id} unit={unit} />)}</ul> : null}
          {group.children.length > 0 ? <ul>{group.children.map((child) => <PublicGroupNode key={child.id} group={child} />)}</ul> : null}
        </div>
      </details>
    </li>
  );
}

function SideColumn({
  label,
  side,
  flagRef,
  groups,
  atomicUnits,
}: {
  label: string;
  side: "ATTACKER" | "DEFENDER";
  flagRef: string | null;
  groups: EventBattleGroup[];
  atomicUnits: EventBattleAtomicUnit[];
}) {
  return (
    <section className="min-w-0 border-t border-edge pt-4" aria-labelledby={`${side.toLowerCase()}-heading`}>
      <div className="flex items-center gap-3">
        {flagRef ? <Image src={flagRef} alt={`${label} flag`} width={48} height={32} unoptimized className="h-8 w-12 rounded border border-edge object-cover" /> : <span aria-hidden className={`h-8 w-12 rounded border border-edge ${side === "DEFENDER" ? "bg-blue-900" : "bg-red-900"}`} />}
        <h3 id={`${side.toLowerCase()}-heading`} className="text-lg font-extrabold text-white">{label}</h3>
      </div>
      {groups.length === 0 && atomicUnits.length === 0 ? <p className="mt-3 text-sm text-muted">No units assigned.</p> : (
        <ul className="mt-3 space-y-1">{groups.map((group) => <PublicGroupNode key={group.id} group={group} />)}{atomicUnits.map((unit) => <PublicAtomicNode key={unit.id} unit={unit} />)}</ul>
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
}: {
  result: string | null;
  defenderFlagRef: string | null;
  attackerFlagRef: string | null;
  groups: EventBattleGroup[];
  ungroupedAtomicUnits: EventBattleAtomicUnit[];
}) {
  const resultLabel = result === "DEFENDER_WIN" ? "Victory" : result === "ATTACKER_WIN" ? "Defeat" : result === "DRAW" ? "Draw" : "Not recorded";
  const resultClass = result === "DEFENDER_WIN" ? "text-green-bright" : result === "ATTACKER_WIN" ? "text-red-300" : "text-white";
  const defenderGroups = groups.filter((group) => group.side === "DEFENDER");
  const attackerGroups = groups.filter((group) => group.side === "ATTACKER");
  const defenderUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "DEFENDER");
  const attackerUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "ATTACKER");
  const hasAssignedNodes = defenderGroups.length + attackerGroups.length + defenderUnits.length + attackerUnits.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="battle-structure-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-edge pb-3">
        <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
        <p className="text-sm text-muted">Event result: <strong className={resultClass}>{resultLabel}</strong></p>
      </div>
      {!hasAssignedNodes ? <p className="py-3 text-sm text-muted">Battle sides not configured.</p> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SideColumn label="Defenders" side="DEFENDER" flagRef={defenderFlagRef} groups={defenderGroups} atomicUnits={defenderUnits} />
          <SideColumn label="Attackers" side="ATTACKER" flagRef={attackerFlagRef} groups={attackerGroups} atomicUnits={attackerUnits} />
        </div>
      )}
    </section>
  );
}