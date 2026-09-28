import Image from "next/image";

import type { PublicEventCommandGroup } from "@/modules/audits/server/command-groups";

function PublicAtomicNode({ unit }: { unit: PublicEventCommandGroup["atomicUnits"][number] }) {
  return (
    <li className="border-l border-edge py-1 pl-3">
      <div className="text-sm font-medium text-body-soft">{unit.name ?? unit.persistentUnitName}</div>
      <div className="text-xs text-muted">{unit.persistentUnitName}{unit.unitType ? ` · ${unit.unitType.toLowerCase()}` : ""}{unit.isMandatory ? " · Mandatory" : ""}</div>
      <details className="mt-1">
        <summary className="w-fit cursor-pointer text-xs text-gold hover:text-gold-bright">Battle details</summary>
        <div className="mt-2 grid gap-2 border-l border-edge pl-3 text-xs">
          <div><div className="font-semibold text-foreground">Unit Statistics</div><div className="text-muted">Results pending</div></div>
          <div><div className="font-semibold text-foreground">Participating Players</div><div className="text-muted">Results pending</div></div>
          <p className="text-muted">Battle results pending.</p>
        </div>
      </details>
    </li>
  );
}

function PublicGroupNode({ group }: { group: PublicEventCommandGroup }) {
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
  groups: PublicEventCommandGroup[];
  atomicUnits: PublicEventCommandGroup["atomicUnits"];
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
  groups: PublicEventCommandGroup[];
  ungroupedAtomicUnits: PublicEventCommandGroup["atomicUnits"];
}) {
  const defenderGroups = groups.filter((group) => group.side === "DEFENDER");
  const attackerGroups = groups.filter((group) => group.side === "ATTACKER");
  const defenderUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "DEFENDER");
  const attackerUnits = ungroupedAtomicUnits.filter((unit) => unit.side === "ATTACKER");
  const hasAssignedNodes = defenderGroups.length + attackerGroups.length + defenderUnits.length + attackerUnits.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="battle-structure-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-edge pb-3">
        <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
        <p className="text-sm text-muted">Event result: <strong className="text-white">{result ?? "Not recorded"}</strong></p>
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