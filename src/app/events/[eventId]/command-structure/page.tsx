import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import {
  attachAtomicEventUnitAction,
  attachChildEventCommandGroupAction,
  createEventAtomicEventUnitAction,
  createEventCommandGroupAction,
  deleteEventAtomicEventUnitAction,
  deleteEventCommandGroupAction,
  detachAtomicEventUnitAction,
  reparentEventCommandGroupAction,
  updateEventAtomicEventUnitAction,
  updateEventCommandGroupAction,
} from "@/modules/audits/server/actions";
import {
  getEventCommandGroupManagementOptions,
  getPublicEventCommandStructure,
  type PublicEventCommandGroup,
} from "@/modules/audits/server/command-groups";
import { canManageEvent } from "@/modules/events/server/authorization";
import { DraggableNode, DropTarget } from "./drag-drop";

export const dynamic = "force-dynamic";

type ManagementOptions = NonNullable<Awaited<ReturnType<typeof getEventCommandGroupManagementOptions>>>;

function GroupNode({
  eventId,
  group,
  options,
}: {
  eventId: string;
  group: PublicEventCommandGroup;
  options: ManagementOptions;
}) {
  const descendantIds = new Set<string>();
  const collectDescendants = (node: PublicEventCommandGroup) => {
    for (const child of node.children) {
      descendantIds.add(child.id);
      collectDescendants(child);
    }
  };
  collectDescendants(group);

  const possibleParents = options.groups.filter(
    (candidate) => candidate.id !== group.id && !descendantIds.has(candidate.id) && (group.side === null || candidate.side === null || candidate.side === group.side),
  );
  const possibleChildren = options.groups.filter(
    (candidate) => candidate.parentGroupId === null && candidate.id !== group.id && (group.side === null || candidate.side === null || candidate.side === group.side),
  );
  const unattachedAtomicUnits = options.atomicUnits.filter((unit) => unit.commandGroupId === null && (group.side === null || unit.side === null || unit.side === group.side));

  return (
    <li className="border-l border-edge pl-4">
      <DropTarget eventId={eventId} groupId={group.id} reparentAction={reparentEventCommandGroupAction} attachAtomicAction={attachAtomicEventUnitAction}>
        <section className="space-y-4 py-4" aria-labelledby={`group-${group.id}`}>
        <DraggableNode type="group" id={group.id}>
        <div>
          <h3 id={`group-${group.id}`} className="font-semibold">{group.name}</h3>
          <p className="text-sm text-muted">
            Represents {group.representedUnit.name} · Commander Player {group.commanderPlayerId}
          </p>
        </div>
        </DraggableNode>

        <div className="grid gap-3 lg:grid-cols-2">
          <form action={updateEventCommandGroupAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="groupId" value={group.id} />
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              Group name
              <input name="name" defaultValue={group.name} required className="rounded border border-edge bg-background p-2" />
            </label>
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              Approved participation
              <select name="participationId" defaultValue={group.participationId ?? ""} required className="rounded border border-edge bg-background p-2">
                <option value="">Select approved participation</option>
                {options.participations.map((participation) => <option key={participation.id} value={participation.id}>{participation.unit.name}</option>)}
              </select>
            </label>
            <label className="flex min-w-32 flex-1 flex-col gap-1 text-sm">Side<select name="side" defaultValue={group.side ?? ""} required className="rounded border border-edge bg-background p-2"><option value="DEFENDER">Defender</option><option value="ATTACKER">Attacker</option></select></label>
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              Commander Player
              <select name="commanderPlayerId" defaultValue={options.players.find((player) => player.playerId === group.commanderPlayerId)?.id} className="rounded border border-edge bg-background p-2">
                {options.players.map((player) => <option key={player.id} value={player.id}>{player.playerId}</option>)}
              </select>
            </label>
            <button className="rounded bg-gold px-3 py-2 text-sm font-semibold text-gold-ink" type="submit">Save</button>
          </form>

          <div className="flex flex-wrap items-end gap-2">
            <form action={reparentEventCommandGroupAction} className="flex flex-1 flex-wrap items-end gap-2">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="groupId" value={group.id} />
              <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
                Parent group
                <select name="parentGroupId" defaultValue={options.groups.find((item) => item.id === group.id)?.parentGroupId ?? ""} className="rounded border border-edge bg-background p-2">
                  <option value="">Top level</option>
                  {possibleParents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
                </select>
              </label>
              <button className="rounded border border-edge px-3 py-2 text-sm font-semibold" type="submit">Move</button>
            </form>
            <form action={deleteEventCommandGroupAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="groupId" value={group.id} />
              <button className="rounded border border-red-500/50 px-3 py-2 text-sm font-semibold text-red-300" type="submit">Delete group</button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold">Atomic Event-units</h4>
            {group.atomicUnits.length === 0 ? <p className="mt-1 text-sm text-muted">None attached</p> : (
              <ul className="mt-2 divide-y divide-edge border-y border-edge">
                {group.atomicUnits.map((unit) => (
                  <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <DraggableNode type="atomic" id={unit.id}><span>{unit.name ?? unit.persistentUnitName} · {unit.side ?? "Side not configured"} · {unit.isMandatory ? "Mandatory" : "Optional"}{unit.unitType ? ` · ${unit.unitType}` : ""}</span></DraggableNode>
                    <form action={updateEventAtomicEventUnitAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="atomicEventUnitId" value={unit.id} />
                      <select name="participationId" defaultValue={group.participationId ?? ""} required className="rounded border border-edge bg-background p-1 text-xs"><option value="">Select participation</option>{options.participations.map((participation) => <option key={participation.id} value={participation.id}>{participation.unit.name}</option>)}</select>
                      <input name="name" defaultValue={unit.name ?? unit.persistentUnitName} required className="w-32 rounded border border-edge bg-background p-1 text-xs" />
                      <select name="side" defaultValue={unit.side ?? group.side ?? "DEFENDER"} className="rounded border border-edge bg-background p-1 text-xs"><option value="DEFENDER">Defender</option><option value="ATTACKER">Attacker</option></select>
                      <select name="auditUnitType" defaultValue={unit.auditUnitType ?? unit.unitType ?? "REGULAR"} className="rounded border border-edge bg-background p-1 text-xs"><option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option></select>
                      <input type="hidden" name="isMandatory" value={unit.isMandatory ? "true" : "false"} />
                      <button className="text-xs font-semibold underline" type="submit">Save</button>
                    </form>
                    <form action={detachAtomicEventUnitAction}>
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="atomicEventUnitId" value={unit.id} />
                      <button className="text-xs font-semibold underline" type="submit">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={attachAtomicEventUnitAction} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="groupId" value={group.id} />
              <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
                Attach atomic unit
                <select name="atomicEventUnitId" required className="rounded border border-edge bg-background p-2">
                  {unattachedAtomicUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.representedUnitName} · {unit.id.slice(0, 8)}</option>)}
                </select>
              </label>
              <button disabled={unattachedAtomicUnits.length === 0} className="rounded border border-edge px-3 py-2 text-sm font-semibold disabled:opacity-50" type="submit">Attach</button>
            </form>
          </div>

          <form action={attachChildEventCommandGroupAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="parentGroupId" value={group.id} />
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              Attach child group
              <select name="childGroupId" required className="rounded border border-edge bg-background p-2">
                {possibleChildren.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>
            </label>
            <button disabled={possibleChildren.length === 0} className="rounded border border-edge px-3 py-2 text-sm font-semibold disabled:opacity-50" type="submit">Attach</button>
          </form>
        </div>
        </section>
      </DropTarget>

      {group.children.length > 0 ? (
        <ul className="space-y-2">{group.children.map((child) => <GroupNode key={child.id} eventId={eventId} group={child} options={options} />)}</ul>
      ) : null}
    </li>
  );
}

export default async function EventCommandStructurePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const structure = await getPublicEventCommandStructure(eventId);
  if (structure === null) notFound();

  const viewerUserId = await getAuthenticatedUserId();
  const viewerCanManage = viewerUserId !== null && await canManageEvent(viewerUserId, eventId);
  const managementOptions = viewerCanManage ? await getEventCommandGroupManagementOptions(eventId) : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
        <Link className="underline" href={`/events/${eventId}`}>{structure.event.name}</Link>
        <span className="mx-2">/</span>
        <span>Command structure</span>
      </nav>
      <h1 className="text-3xl font-bold">{structure.event.name}: Command structure</h1>

      <section className="mt-8" aria-labelledby="public-tree-heading">
        <h2 id="public-tree-heading" className="text-xl font-semibold">Command groups</h2>
        {structure.groups.length === 0 ? <p className="mt-3 text-sm text-muted">No command groups recorded.</p> : (
          <ul className="mt-3 space-y-3">
            {structure.groups.map((group) => (
              <li key={group.id} className="border-t border-edge">
                <div className="py-3">
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-sm text-muted">{group.representedUnit.name} · Commander Player {group.commanderPlayerId}</p>
                  {group.atomicUnits.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-4 text-sm">
                      {group.atomicUnits.map((unit) => <li key={unit.id}>{unit.persistentUnitName} · {unit.isMandatory ? "Mandatory" : "Optional"}{unit.unitType ? ` · ${unit.unitType}` : ""}</li>)}
                    </ul>
                  ) : null}
                  {group.children.length > 0 ? <ul className="ml-3 mt-2 space-y-2 border-l border-edge pl-4">{group.children.map((child) => <li key={child.id}><PublicGroup group={child} /></li>)}</ul> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {structure.ungroupedAtomicUnits.length > 0 ? (
          <section className="mt-6 border-t border-edge pt-4">
            <h3 className="font-semibold">Unassigned atomic Event-units</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {structure.ungroupedAtomicUnits.map((unit) => <li key={unit.id}>{unit.persistentUnitName} · {unit.isMandatory ? "Mandatory" : "Optional"}{unit.unitType ? ` · ${unit.unitType}` : ""}</li>)}
            </ul>
          </section>
        ) : null}
      </section>

      {viewerCanManage && managementOptions ? (
        <section className="mt-10 border-t border-edge pt-6" aria-labelledby="manage-tree-heading">
          <h2 id="manage-tree-heading" className="text-xl font-semibold">Manage structure</h2>
          <form action={createEventCommandGroupAction} className="mt-4 grid gap-3 border-b border-edge pb-5 md:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="flex flex-col gap-1 text-sm">Group name<input name="name" required className="rounded border border-edge bg-background p-2" /></label>
            <label className="flex flex-col gap-1 text-sm">Approved participation<select name="participationId" required className="rounded border border-edge bg-background p-2">{managementOptions.participations.map((participation) => <option key={participation.id} value={participation.id}>{participation.unit.name}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm">Side<select name="side" required className="rounded border border-edge bg-background p-2"><option value="DEFENDER">Defender</option><option value="ATTACKER">Attacker</option></select></label>
            <label className="flex flex-col gap-1 text-sm">Commander Player<select name="commanderPlayerId" required className="rounded border border-edge bg-background p-2">{managementOptions.players.map((player) => <option key={player.id} value={player.id}>{player.playerId}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm">Parent group<select name="parentGroupId" className="rounded border border-edge bg-background p-2"><option value="">Top level</option>{managementOptions.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            <button className="w-fit rounded bg-gold px-4 py-2 text-sm font-semibold text-gold-ink" type="submit">Create group</button>
          </form>
          <form action={createEventAtomicEventUnitAction} className="mt-4 grid gap-3 border-b border-edge pb-5 md:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="flex flex-col gap-1 text-sm">Atomic name<input name="name" required className="rounded border border-edge bg-background p-2" /></label>
            <label className="flex flex-col gap-1 text-sm">Side<select name="side" required className="rounded border border-edge bg-background p-2"><option value="DEFENDER">Defender</option><option value="ATTACKER">Attacker</option></select></label>
            <label className="flex flex-col gap-1 text-sm">Audit type<select name="auditUnitType" required className="rounded border border-edge bg-background p-2"><option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option></select></label>
            <label className="flex flex-col gap-1 text-sm">Approved participation<select name="participationId" required className="rounded border border-edge bg-background p-2">{managementOptions.participations.map((participation) => <option key={participation.id} value={participation.id}>{participation.unit.name}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm">Mandatory<select name="isMandatory" defaultValue="true" className="rounded border border-edge bg-background p-2"><option value="true">Yes</option><option value="false">No</option></select></label>
            <button className="w-fit self-end rounded bg-gold px-4 py-2 text-sm font-semibold text-gold-ink" type="submit">Create atomic unit</button>
          </form>
          {structure.ungroupedAtomicUnits.length > 0 ? (
            <ul className="mt-4 divide-y divide-edge border-b border-edge text-sm">
              {structure.ungroupedAtomicUnits.map((unit) => (
                <li key={unit.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>{unit.name ?? unit.persistentUnitName} · {unit.side ?? "Side not configured"} · {unit.auditUnitType ?? unit.unitType ?? "Audit type not configured"}</span>
                  <form action={deleteEventAtomicEventUnitAction}><input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="atomicEventUnitId" value={unit.id} /><button type="submit" className="text-xs font-semibold text-red-300 underline">Remove unused unit</button></form>
                </li>
              ))}
            </ul>
          ) : null}
          {structure.groups.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {structure.groups.map((group) => <GroupNode key={group.id} eventId={eventId} group={group} options={managementOptions} />)}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function PublicGroup({ group }: { group: PublicEventCommandGroup }) {
  return (
    <div>
      <h4 className="font-medium">{group.name}</h4>
      <p className="text-sm text-muted">{group.representedUnit.name} · Commander Player {group.commanderPlayerId}</p>
      {group.atomicUnits.length > 0 ? <ul className="mt-1 space-y-1 pl-4 text-sm">{group.atomicUnits.map((unit) => <li key={unit.id}>{unit.persistentUnitName} · {unit.isMandatory ? "Mandatory" : "Optional"}{unit.unitType ? ` · ${unit.unitType}` : ""}</li>)}</ul> : null}
      {group.children.length > 0 ? <ul className="ml-3 mt-2 space-y-2 border-l border-edge pl-4">{group.children.map((child) => <li key={child.id}><PublicGroup group={child} /></li>)}</ul> : null}
    </div>
  );
}