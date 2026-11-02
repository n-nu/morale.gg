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

import { DragSurface, DropTarget } from "../command-structure/drag-drop";
import { MoveMenu } from "./move-menu";

type ManagerOptions = NonNullable<Awaited<ReturnType<typeof getEventCommandGroupManagementOptions>>>;
type AtomicUnit = PublicEventCommandGroup["atomicUnits"][number];

type IconName = "actions" | "attacker" | "commander" | "defender" | "drop" | "group" | "plus" | "unit" | "unsorted";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {name === "attacker" ? <><path d="m5 19 14-14" /><path d="M13 5h6v6" /><path d="m5 5 5 5" /><path d="M5 5v6M5 5h6" /></> : null}
      {name === "defender" ? <path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z" /> : null}
      {name === "group" ? <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><path d="M7.5 11v3h9v-3M12 14v5M9 19h6" /></> : null}
      {name === "unit" ? <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8v8H8z" /></> : null}
      {name === "commander" ? <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.2 3.2-5 7-5s6.5 1.8 7 5" /></> : null}
      {name === "plus" ? <><path d="M12 5v14M5 12h14" /></> : null}
      {name === "drop" ? <><path d="M12 4v12m0 0 5-5m-5 5-5-5M4 20h16" /></> : null}
      {name === "actions" ? <><circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" /></> : null}
      {name === "unsorted" ? <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" fill="currentColor" /></> : null}
    </svg>
  );
}

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
    <li className="min-w-0">
      <DropTarget eventId={eventId} destination={{ side: unit.side }} label={`Drop target for ${unit.name ?? unit.persistentUnitName}`} moveAction={moveEventBattlefieldNodeAction} className="block rounded-xl">
        <DragSurface
          type="atomic"
          id={unit.id}
          label={unit.name ?? unit.persistentUnitName}
          className="flex min-w-0 items-start gap-2 rounded-xl border border-edge-strong bg-surface px-2.5 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="break-words text-sm font-semibold text-foreground">{unit.name ?? unit.persistentUnitName}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-edge-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-body-soft">
                <Icon name="unit" className="h-3 w-3" /> Company
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted">
              <span className="break-words">{unit.persistentUnitName}</span>
              {unit.auditUnitType ? <span className="rounded-full bg-white/5 px-2 py-0.5">{unit.auditUnitType.toLowerCase()}</span> : null}
              {unit.isMandatory ? <span className="rounded-full border border-gold/30 px-2 py-0.5 text-gold">Mandatory</span> : null}
            </div>
          </div>
          <details className="relative shrink-0">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden" aria-label={`Actions for company ${unit.name ?? unit.persistentUnitName}`} title="Company actions">
              <Icon name="actions" />
            </summary>
            <div className="absolute right-0 z-20 mt-1 grid max-h-[80vh] w-[min(18rem,calc(100vw-2rem))] gap-3 overflow-y-auto rounded-xl border border-edge bg-surface-2 p-3 shadow-xl">
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
                <button type="submit" className="text-xs text-type-red" aria-label="Remove company">Remove company</button>
              </form>
            </div>
          </details>
        </DragSurface>
      </DropTarget>
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
  const hasChildren = group.atomicUnits.length + group.children.length > 0;

  return (
    <li className="min-w-0">
      <DropTarget eventId={eventId} destination={{ groupId: group.id }} label={`Drop inside ${group.name}`} moveAction={moveEventBattlefieldNodeAction} className="block rounded-2xl">
        <DragSurface
          type="group"
          id={group.id}
          descendantIds={descendantIds}
          label={group.name}
          className={`min-w-0 rounded-2xl border px-2 py-2 sm:px-2.5 sm:py-2.5 ${hasChildren ? "border-edge-strong bg-surface" : "border-edge bg-surface/75"}`}
        >
          <div className="flex min-w-0 items-start gap-1.5">
            <details open className="min-w-0 flex-1">
              <summary className="min-w-0 cursor-pointer rounded-lg px-1 py-1 text-sm font-semibold text-foreground marker:text-muted">
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Icon name="group" className="h-4 w-4 shrink-0 text-gold" />
                  <span className="break-words">{group.name}</span>
                  <span className="rounded-full border border-gold/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">Command Group</span>
                </span>
                <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs font-normal text-muted">
                  <span className="break-words">{group.representedUnit.name}</span>
                  <span role="group" aria-label={`Commander: ${group.commanderPlayerId}`} title="Commander assignment" className="inline-flex min-w-0 flex-wrap items-center gap-1">
                    <Icon name="commander" className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Commander</span>
                    <span className="sm:hidden">Cmdr.</span>
                    <span className="break-words text-body-soft">{group.commanderPlayerId}</span>
                  </span>
                </span>
              </summary>
              {hasChildren ? (
                <div className="mt-2 rounded-xl border border-edge bg-background/70 p-1.5 sm:p-2">
                  <ul className="grid min-w-0 gap-1.5">
                    {group.atomicUnits.map((unit) => <AtomicRow key={unit.id} eventId={eventId} unit={unit} options={options} groups={options.groups} />)}
                    {group.children.map((child) => <GroupNode key={child.id} eventId={eventId} group={child} options={options} />)}
                  </ul>
                </div>
              ) : null}
            </details>
            <details className="relative shrink-0">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden" aria-label={`Actions for command group ${group.name}`} title="Command group actions">
                <Icon name="actions" />
              </summary>
              <div className="absolute right-0 z-20 grid max-h-[80vh] w-[min(18rem,calc(100vw-2rem))] gap-3 overflow-y-auto rounded-xl border border-edge bg-surface-2 p-3 shadow-xl">
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
        </DragSurface>
      </DropTarget>
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
    <section className="min-w-0 rounded border border-edge bg-surface/40 p-2.5 sm:p-3" aria-labelledby={`${side.toLowerCase()}-organizer-heading`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${side.toLowerCase()}-organizer-heading`} className={`inline-flex items-center gap-2 text-xs font-bold tracking-wide ${defender ? "text-blue-200" : "text-red-200"}`}>
          <Icon name={defender ? "defender" : "attacker"} />
          {defender ? "DEFENDERS" : "ATTACKERS"}
        </h3>
        <span className="rounded border border-edge-strong px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted" aria-label={`${groups.length + atomicUnits.length} root nodes`}>
          {groups.length + atomicUnits.length} root {groups.length + atomicUnits.length === 1 ? "node" : "nodes"}
        </span>
      </div>
      <DropTarget eventId={eventId} destination={{ side }} label={`Drop units or groups in ${label.toLowerCase()}`} moveAction={moveEventBattlefieldNodeAction} className="mb-2 flex min-h-10 items-center gap-2 rounded border border-dashed border-edge-strong px-2 py-2 text-xs text-muted">
        <Icon name="drop" className="h-4 w-4 shrink-0 text-gold" />
        <span>{groups.length === 0 && atomicUnits.length === 0 ? `Drop units or groups here · ${defender ? "Defender" : "Attacker"} root` : `Drop at ${defender ? "Defender" : "Attacker"} root`}</span>
      </DropTarget>
      {groups.length + atomicUnits.length > 0 ? (
        <ul className="min-h-10 space-y-1.5">
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
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="battle-structure-heading" className="text-lg font-extrabold text-white">Battle Structure</h2>
          <p className="mt-1 text-xs text-muted">Drag any node by its body, or use node actions to move it without dragging.</p>
        </div>
        <p className="text-xs text-muted">Command groups contain companies and child groups.</p>
      </div>
      {roots.length === 0 && structure.ungroupedAtomicUnits.length === 0 ? <p className="mb-3 text-sm text-muted">No battlefield structure yet.</p> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <details className="relative">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded border border-gold px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
            <Icon name="plus" className="h-4 w-4" /> Company
          </summary>
          <form action={createEventAtomicEventUnitAction} className="absolute left-0 z-20 mt-2 grid w-[min(22rem,calc(100vw-2rem))] gap-2 rounded border border-edge bg-surface-2 p-4 shadow-xl">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-xs text-muted">Name<input name="name" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
            <label className="text-xs text-muted">Represented Unit<select name="participationId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
            <label className="text-xs text-muted">Audit Type<select name="auditUnitType" defaultValue="REGULAR" className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground"><option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option></select></label>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="isMandatory" value="true" defaultChecked />Mandatory</label>
            {options.participations.length === 0 ? <p className="text-xs text-muted">Approve a participating Unit before creating a node.</p> : <button type="submit" className="justify-self-start rounded bg-gold px-3 py-1.5 text-sm font-semibold text-gold-ink">Create Company</button>}
          </form>
        </details>
        <details className="relative">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded border border-edge-strong px-3 py-2 text-sm font-semibold text-foreground hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
            <Icon name="plus" className="h-4 w-4 text-muted" /> Command Group
          </summary>
          <form action={createEventCommandGroupAction} className="absolute left-0 z-20 grid w-[min(22rem,calc(100vw-2rem))] gap-2 rounded border border-edge bg-surface-2 p-4 shadow-xl">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-xs text-muted">Name<input name="name" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground" /></label>
            <label className="text-xs text-muted">Represented Unit<select name="participationId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.participations.map((item) => <option key={item.id} value={item.id}>{item.unit.name}</option>)}</select></label>
            <label className="text-xs text-muted">Commander<select name="commanderPlayerId" required className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">{options.players.map((player) => <option key={player.id} value={player.id}>{player.playerId}</option>)}</select></label>
            {options.participations.length === 0 || options.players.length === 0 ? <p className="text-xs text-muted">An approved Unit and a Player are required.</p> : <button type="submit" className="justify-self-start rounded bg-gold px-3 py-1.5 text-sm font-semibold text-gold-ink">Create Group</button>}
          </form>
        </details>
      </div>

      <section className="mb-4 rounded border border-edge bg-background/50 p-2.5 sm:p-3" aria-label="Unsorted battlefield nodes">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-body-soft">
            <Icon name="unsorted" className="h-4 w-4 text-muted" />
            UNSORTED
          </h3>
          <span className="rounded border border-edge-strong px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
            {unsortedGroups.length + unsortedAtomic.length}
          </span>
        </div>
        <DropTarget eventId={eventId} destination={{ side: null }} label="Return nodes to Unsorted" moveAction={moveEventBattlefieldNodeAction} className="flex min-h-10 items-center gap-2 rounded border border-dashed border-edge-strong px-2 py-2 text-xs text-muted">
          <Icon name="unsorted" className="h-4 w-4 shrink-0 text-gold" />
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