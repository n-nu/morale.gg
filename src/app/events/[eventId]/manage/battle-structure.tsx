import {
  createEventAtomicEventUnitAction,
  createEventCommandGroupAction,
  deleteEventAtomicEventUnitAction,
  deleteEventCommandGroupAction,
  moveEventBattlefieldNodeAction,
  updateEventAtomicEventUnitAction,
  updateEventCommandGroupAction,
} from "@/modules/audits/server/actions";
import {
  getEventCommandGroupManagementOptions,
  getManagerEventCommandStructure,
  type PublicEventCommandGroup,
} from "@/modules/audits/server/command-groups";

import { DragHandle, DropTarget } from "../command-structure/drag-drop";
import { MoveMenu } from "./move-menu";

type ManagerOptions = NonNullable<Awaited<ReturnType<typeof getEventCommandGroupManagementOptions>>>;
type AtomicUnit = PublicEventCommandGroup["atomicUnits"][number];

function descendants(group: PublicEventCommandGroup): string[] {
  return group.children.flatMap((child) => [child.id, ...descendants(child)]);
}

function AtomicRow({
  eventId,
  unit,
  options,
  groups,
}: {
  eventId: string;
  unit: AtomicUnit;
  options: ManagerOptions;
  groups: ManagerOptions["groups"];
}) {
  return (
    <li className="border-l border-edge pl-3">
      <div className="flex items-start gap-2 py-1">
        <DropTarget eventId={eventId} destination={{ side: unit.side }} label={`Drop target for ${unit.name ?? unit.persistentUnitName}`} moveAction={moveEventBattlefieldNodeAction}>
          <div className="flex items-start gap-2 rounded px-1 py-1">
            <DragHandle type="atomic" id={unit.id} label={unit.name ?? unit.persistentUnitName} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{unit.name ?? unit.persistentUnitName}</div>
              <div className="text-xs text-muted">{unit.persistentUnitName}{unit.auditUnitType ? ` · ${unit.auditUnitType.toLowerCase()}` : ""}{unit.isMandatory ? " · Mandatory" : ""}</div>
            </div>
          </div>
        </DropTarget>
        <details className="relative shrink-0">
          <summary className="cursor-pointer list-none rounded px-2 py-1 text-sm text-muted hover:bg-white/5 hover:text-foreground" aria-label="More atomic unit actions">...</summary>
          <div className="absolute right-0 z-20 mt-1 grid w-72 gap-3 border border-edge bg-[#171817] p-3 shadow-xl">
            <form action={updateEventAtomicEventUnitAction} className="grid gap-2">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="atomicEventUnitId" value={unit.id} />
              <label className="text-xs text-muted">Name<input name="name" required defaultValue={unit.name ?? unit.persistentUnitName} className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
              <label className="text-xs text-muted">Represented Unit<select name="participationId" defaultValue={options.participations.find((item) => item.unit.name === unit.persistentUnitName)?.id ?? ""} required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
              <input type="hidden" name="side" value={unit.side ?? ""} />
              <label className="text-xs text-muted">Audit Type<select name="auditUnitType" defaultValue={unit.auditUnitType ?? "REGULAR"} className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground"><option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option></select></label>
              <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="isMandatory" value="true" defaultChecked={unit.isMandatory} />Mandatory</label>
              <button type="submit" className="justify-self-start text-xs font-semibold text-gold">Save</button>
            </form>
            <MoveMenu eventId={eventId} nodeType="atomic" nodeId={unit.id} groups={groups} moveAction={moveEventBattlefieldNodeAction} />
            <form action={deleteEventAtomicEventUnitAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="atomicEventUnitId" value={unit.id} />
              <button type="submit" className="text-xs text-type-red" aria-label="Remove atomic unit">Remove atomic unit</button>
            </form>
          </div>
        </details>
      </div>
    </li>
  );
}

function GroupNode({
  eventId,
  group,
  options,
}: {
  eventId: string;
  group: PublicEventCommandGroup;
  options: ManagerOptions;
}) {
  const descendantIds = descendants(group);
  const excludedGroupIds = [group.id, ...descendantIds];

  return (
    <li className="border-l border-edge pl-3">
      <div className="flex items-start gap-2 py-1">
        <DragHandle type="group" id={group.id} descendantIds={descendantIds} label={group.name} />
        <details open className="min-w-0 flex-1">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            <DropTarget eventId={eventId} destination={{ groupId: group.id }} label={`Drop inside ${group.name}`} moveAction={moveEventBattlefieldNodeAction} inline>
              <span>{group.name}</span>
            </DropTarget>
          </summary>
          <div className="ml-2 border-l border-edge pl-3">
            <div className="pb-1 text-xs text-muted">{group.representedUnit.name} · Commander {group.commanderPlayerId}</div>
            {group.atomicUnits.length > 0 ? <ul>{group.atomicUnits.map((unit) => <AtomicRow key={unit.id} eventId={eventId} unit={unit} options={options} groups={options.groups} />)}</ul> : null}
            {group.children.length > 0 ? <ul>{group.children.map((child) => <GroupNode key={child.id} eventId={eventId} group={child} options={options} />)}</ul> : null}
          </div>
        </details>
        <details className="relative shrink-0">
          <summary className="cursor-pointer list-none rounded px-2 py-1 text-sm text-muted hover:bg-white/5 hover:text-foreground" aria-label="More group actions">...</summary>
          <div className="absolute right-0 z-20 grid w-72 gap-3 border border-edge bg-[#171817] p-3 shadow-xl">
            <form action={updateEventCommandGroupAction} className="grid gap-2">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="side" value={group.side ?? ""} />
              <label className="text-xs text-muted">Name<input name="name" required defaultValue={group.name} className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
              <label className="text-xs text-muted">Represented Unit<select name="participationId" defaultValue={group.participationId ?? ""} required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
              <label className="text-xs text-muted">Commander<select name="commanderPlayerId" defaultValue={options.players.find((player) => player.playerId === group.commanderPlayerId)?.id ?? ""} required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.players.map((player) => <option key={player.id} value={player.id}>{player.playerId}</option>)}</select></label>
              <button type="submit" className="justify-self-start text-xs font-semibold text-gold">Save</button>
            </form>
            <MoveMenu eventId={eventId} nodeType="group" nodeId={group.id} groups={options.groups} excludedGroupIds={excludedGroupIds} moveAction={moveEventBattlefieldNodeAction} />
            <form action={deleteEventCommandGroupAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="groupId" value={group.id} />
              <button type="submit" className="text-xs text-type-red" aria-label="Remove group">Remove group</button>
            </form>
          </div>
        </details>
      </div>
    </li>
  );
}

function SideOrganizer({
  eventId,
  side,
  groups,
  atomicUnits,
  options,
}: {
  eventId: string;
  side: "ATTACKER" | "DEFENDER";
  groups: PublicEventCommandGroup[];
  atomicUnits: AtomicUnit[];
  options: ManagerOptions;
}) {
  const defender = side === "DEFENDER";
  const label = defender ? "DEFENDERS" : "ATTACKERS";
  return (
    <section className="min-w-0 border-t border-edge pt-3" aria-labelledby={`${side.toLowerCase()}-organizer-heading`}>
      <h3 id={`${side.toLowerCase()}-organizer-heading`} className={`mb-2 text-xs font-bold tracking-wide ${defender ? "text-blue-300" : "text-red-300"}`}>{label}</h3>
      <DropTarget eventId={eventId} destination={{ side }} label={`Drop units or groups in ${label.toLowerCase()}`} moveAction={moveEventBattlefieldNodeAction} className="mb-2 block border-b border-dashed border-edge px-2 py-2 text-xs text-muted">
        <span>{groups.length === 0 && atomicUnits.length === 0 ? "Drop units or groups here" : `Drop at ${label.toLowerCase()} root`}</span>
      </DropTarget>
      {groups.length + atomicUnits.length > 0 ? (
        <ul className="min-h-10 space-y-1">
          {groups.map((group) => <GroupNode key={group.id} eventId={eventId} group={group} options={options} />)}
          {atomicUnits.map((unit) => <AtomicRow key={unit.id} eventId={eventId} unit={unit} options={options} groups={options.groups} />)}
        </ul>
      ) : null}
    </section>
  );
}

export async function BattleStructureManager({ eventId, userId }: { eventId: string; userId: string }) {
  const [structure, options] = await Promise.all([
    getManagerEventCommandStructure(userId, eventId),
    getEventCommandGroupManagementOptions(eventId),
  ]);
  if (structure === null || options === null) return null;

  const roots = structure.groups;
  const ungrouped = structure.ungroupedAtomicUnits.filter((unit) => options.atomicUnits.find((item) => item.id === unit.id)?.commandGroupId === null);
  const unsortedGroups = roots.filter((group) => group.side === null);
  const unsortedAtomic = ungrouped.filter((unit) => unit.side === null);
  const defenderGroups = roots.filter((group) => group.side === "DEFENDER");
  const attackerGroups = roots.filter((group) => group.side === "ATTACKER");
  const defenderAtomic = ungrouped.filter((unit) => unit.side === "DEFENDER");
  const attackerAtomic = ungrouped.filter((unit) => unit.side === "ATTACKER");

  return (
    <section id="battle-structure" className="border-y border-edge py-5" aria-labelledby="battle-structure-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
        <p className="text-xs text-muted">Create units and groups, then place them in the battlefield.</p>
      </div>
      {roots.length === 0 && structure.ungroupedAtomicUnits.length === 0 ? <p className="mb-3 text-sm text-muted">No battlefield structure yet.</p> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <details className="relative">
          <summary className="cursor-pointer list-none rounded border border-gold px-3 py-2 text-sm font-semibold text-gold">+ Atomic Unit</summary>
          <form action={createEventAtomicEventUnitAction} className="absolute left-0 z-20 mt-2 grid w-[min(22rem,calc(100vw-3rem))] gap-2 border border-edge bg-[#171817] p-4 shadow-xl">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-xs text-muted">Name<input name="name" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
            <label className="text-xs text-muted">Represented Unit<select name="participationId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
            <label className="text-xs text-muted">Audit Type<select name="auditUnitType" defaultValue="REGULAR" className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground"><option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option></select></label>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="isMandatory" value="true" defaultChecked />Mandatory</label>
            {options.participations.length === 0 ? <p className="text-xs text-muted">Approve a participating Unit before creating a node.</p> : <button type="submit" className="justify-self-start rounded bg-gold px-3 py-1.5 text-sm font-semibold text-gold-ink">Create Atomic Unit</button>}
          </form>
        </details>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded border border-edge px-3 py-2 text-sm font-semibold text-foreground">+ Group</summary>
          <form action={createEventCommandGroupAction} className="absolute left-0 z-20 mt-2 grid w-[min(22rem,calc(100vw-3rem))] gap-2 border border-edge bg-[#171817] p-4 shadow-xl">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-xs text-muted">Name<input name="name" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
            <label className="text-xs text-muted">Represented Unit<select name="participationId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
            <label className="text-xs text-muted">Commander<select name="commanderPlayerId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.players.map((player) => <option key={player.id} value={player.id}>{player.playerId}</option>)}</select></label>
            {options.participations.length === 0 || options.players.length === 0 ? <p className="text-xs text-muted">An approved Unit and a Player are required.</p> : <button type="submit" className="justify-self-start rounded bg-gold px-3 py-1.5 text-sm font-semibold text-gold-ink">Create Group</button>}
          </form>
        </details>
      </div>

      <section className="mb-5" aria-label="Unsorted battlefield nodes">
        <h3 className="mb-2 text-xs font-bold text-muted">UNSORTED <span className="font-normal">· {unsortedGroups.length + unsortedAtomic.length}</span></h3>
        <DropTarget eventId={eventId} destination={{ side: null }} label="Return nodes to Unsorted" moveAction={moveEventBattlefieldNodeAction} className="mb-2 block border-b border-dashed border-edge px-2 py-2 text-xs text-muted">
          <span>Return nodes to Unsorted</span>
        </DropTarget>
        {unsortedGroups.length + unsortedAtomic.length > 0 ? (
          <ul className="min-h-10 space-y-1">
            {unsortedGroups.map((group) => <GroupNode key={group.id} eventId={eventId} group={group} options={options} />)}
            {unsortedAtomic.map((unit) => <AtomicRow key={unit.id} eventId={eventId} unit={unit} options={options} groups={options.groups} />)}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SideOrganizer eventId={eventId} side="DEFENDER" groups={defenderGroups} atomicUnits={defenderAtomic} options={options} />
        <SideOrganizer eventId={eventId} side="ATTACKER" groups={attackerGroups} atomicUnits={attackerAtomic} options={options} />
      </div>
    </section>
  );
}