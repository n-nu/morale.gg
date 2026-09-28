import "server-only";

import { Prisma, type AuditUnitType, type BattlefieldSide } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/modules/events/server/authorization";

export class EventCommandGroupError extends Error {}

export type EventCommandGroupInput = {
  name: string;
  participationId?: string;
  representedUnitId?: string;
  side?: BattlefieldSide | null;
  commanderPlayerId: string;
  parentGroupId?: string | null;
};

type CommandGroupTransaction = Prisma.TransactionClient;

function requiredId(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") throw new EventCommandGroupError(`${label} is required.`);
  return normalized;
}

function nullableId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized === "" ? null : normalized;
}

function normalizedGroupInput(input: EventCommandGroupInput) {
  const name = input.name.trim();
  if (name === "") throw new EventCommandGroupError("Group name is required.");
  return {
    name,
    participationId: nullableId(input.participationId),
    representedUnitId: nullableId(input.representedUnitId),
    side: input.side === "ATTACKER" || input.side === "DEFENDER" ? input.side : (() => { throw new EventCommandGroupError("Select a valid battlefield side."); })(),
    commanderPlayerId: requiredId(input.commanderPlayerId, "Commander Player"),
    parentGroupId: nullableId(input.parentGroupId),
  };
}

async function assertCanManageEvent(userId: string, eventId: string) {
  if (userId.trim() === "" || !(await canManageEvent(userId, eventId))) {
    throw new EventCommandGroupError("Unauthorized: user cannot manage this Event.");
  }
}

async function authorizedEventMutation<T>(
  userId: string,
  eventId: string,
  operation: (transaction: CommandGroupTransaction) => Promise<T>,
): Promise<T> {
  await assertCanManageEvent(userId, eventId);
  return prisma.$transaction(async (transaction) => {
    await assertCanManageEvent(userId, eventId);
    if (!(await transaction.event.findUnique({ where: { id: eventId }, select: { id: true } }))) {
      throw new EventCommandGroupError("Event not found.");
    }
    const result = await operation(transaction);
    await validateEventCommandTree(transaction, eventId);
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function eventIdForGroup(groupId: string): Promise<string> {
  const group = await prisma.eventCommandGroup.findUnique({
    where: { id: groupId },
    select: { eventId: true },
  });
  if (group === null) throw new EventCommandGroupError("Command group not found.");
  return group.eventId;
}

async function assertParentInEvent(
  transaction: CommandGroupTransaction,
  eventId: string,
  parentGroupId: string | null,
) {
  if (parentGroupId === null) return;
  const parent = await transaction.eventCommandGroup.findUnique({
    where: { id: parentGroupId },
    select: { eventId: true },
  });
  if (parent === null || parent.eventId !== eventId) {
    throw new EventCommandGroupError("Parent group must belong to the same Event.");
  }
}

async function validateEventCommandTree(
  transaction: CommandGroupTransaction,
  eventId: string,
) {
  const groups = await transaction.eventCommandGroup.findMany({
    where: { eventId },
    select: { id: true, parentGroupId: true, side: true, eventParticipation: { select: { eventId: true } } },
  });
  const atomicUnits = await transaction.eventCommandGroupAtomicUnit.findMany({
    where: { group: { eventId } },
    select: {
      groupId: true,
      atomicEventUnit: { select: { id: true, side: true, eventParticipation: { select: { eventId: true } } } },
    },
  });
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  for (const group of groups) {
    if (group.parentGroupId !== null && !groupsById.has(group.parentGroupId)) {
      throw new EventCommandGroupError("Child groups must belong to the same Event.");
    }
    if (group.eventParticipation !== null && group.eventParticipation.eventId !== eventId) {
      throw new EventCommandGroupError("Command group claims must belong to the same Event.");
    }
    if (group.parentGroupId !== null) {
      const parent = groupsById.get(group.parentGroupId);
      if (parent?.side !== null && group.side !== null && parent?.side !== group.side) {
        throw new EventCommandGroupError("Parent and child command groups must use the same battlefield side.");
      }
    }
  }
  const atomicUnitsByGroup = new Map<string, string[]>();
  for (const membership of atomicUnits) {
    if (!groupsById.has(membership.groupId)) {
      throw new EventCommandGroupError("Atomic Event-units must belong to a group in the same Event.");
    }
    if (membership.atomicEventUnit.eventParticipation.eventId !== eventId) {
      throw new EventCommandGroupError("Atomic Event-units must belong to a group in the same Event.");
    }
    const group = groupsById.get(membership.groupId);
    if (group?.side !== null && membership.atomicEventUnit.side !== null && group?.side !== membership.atomicEventUnit.side) {
      throw new EventCommandGroupError("Atomic Event-units and parent groups must use the same battlefield side.");
    }
    const groupAtomicUnits = atomicUnitsByGroup.get(membership.groupId) ?? [];
    groupAtomicUnits.push(membership.atomicEventUnit.id);
    atomicUnitsByGroup.set(membership.groupId, groupAtomicUnits);
  }

  const completed = new Set<string>();
  const visiting = new Set<string>();
  const validateAncestors = (groupId: string) => {
    if (visiting.has(groupId)) throw new EventCommandGroupError("Command groups cannot contain cycles.");
    if (completed.has(groupId)) return;
    visiting.add(groupId);
    const parentGroupId = groupsById.get(groupId)?.parentGroupId ?? null;
    if (parentGroupId !== null) validateAncestors(parentGroupId);
    visiting.delete(groupId);
    completed.add(groupId);
  };
  for (const group of groups) validateAncestors(group.id);

  const seenAtomicUnits = new Set<string>();
  const validateDescendants = (groupId: string, path: Set<string>) => {
    if (path.has(groupId)) throw new EventCommandGroupError("Command groups cannot contain cycles.");
    const group = groupsById.get(groupId);
    if (group === undefined) return;
    const nextPath = new Set(path).add(groupId);
    for (const atomicUnitId of atomicUnitsByGroup.get(groupId) ?? []) {
      if (seenAtomicUnits.has(atomicUnitId)) {
        throw new EventCommandGroupError("An atomic Event-unit cannot contribute more than once.");
      }
      seenAtomicUnits.add(atomicUnitId);
    }
    for (const child of groups) {
      if (child.parentGroupId === groupId) validateDescendants(child.id, nextPath);
    }
  };
  for (const group of groups) {
    if (group.parentGroupId === null) validateDescendants(group.id, new Set());
  }
  if (completed.size !== groups.length) {
    throw new EventCommandGroupError("Command groups cannot contain cycles.");
  }
}

export async function createEventCommandGroup(
  userId: string,
  eventId: string,
  input: EventCommandGroupInput,
) {
  const normalizedEventId = requiredId(eventId, "Event");
  const values = normalizedGroupInput(input);
  return authorizedEventMutation(userId, normalizedEventId, async (transaction) => {
    await assertParentInEvent(transaction, normalizedEventId, values.parentGroupId);
    await assertParentSide(transaction, values.parentGroupId, values.side);
    const participation = await approvedParticipationForEvent(transaction, normalizedEventId, values.participationId, values.representedUnitId);
    return transaction.eventCommandGroup.create({
      data: {
        name: values.name,
        side: values.side,
        eventId: normalizedEventId,
        eventParticipationId: participation.id,
        commanderPlayerId: values.commanderPlayerId,
        parentGroupId: values.parentGroupId,
      },
    });
  });
}

export async function updateEventCommandGroup(
  userId: string,
  groupId: string,
  input: Omit<EventCommandGroupInput, "parentGroupId">,
) {
  const normalizedGroupId = requiredId(groupId, "Command group");
  const values = normalizedGroupInput(input);
  const eventId = await eventIdForGroup(normalizedGroupId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    if (!(await transaction.eventCommandGroup.findUnique({ where: { id: normalizedGroupId }, select: { id: true } }))) {
      throw new EventCommandGroupError("Command group not found.");
    }
    const existingGroup = await transaction.eventCommandGroup.findUnique({
      where: { id: normalizedGroupId },
      select: { parentGroupId: true },
    });
    const participation = await approvedParticipationForEvent(transaction, eventId, values.participationId, values.representedUnitId);
    await assertParentSide(transaction, existingGroup?.parentGroupId ?? null, values.side);
    return transaction.eventCommandGroup.update({
      where: { id: normalizedGroupId },
      data: {
        name: values.name,
        side: values.side,
        eventParticipationId: participation.id,
        commanderPlayerId: values.commanderPlayerId,
      },
    });
  });
}

export async function attachAtomicEventUnit(
  userId: string,
  groupId: string,
  atomicEventUnitId: string,
) {
  const normalizedGroupId = requiredId(groupId, "Command group");
  const normalizedAtomicId = requiredId(atomicEventUnitId, "Atomic Event-unit");
  const eventId = await eventIdForGroup(normalizedGroupId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    const group = await transaction.eventCommandGroup.findUnique({ where: { id: normalizedGroupId }, select: { id: true, eventId: true, side: true } });
    const atomicUnit = await transaction.atomicEventUnit.findUnique({
      where: { id: normalizedAtomicId },
      select: { id: true, side: true, eventParticipation: { select: { eventId: true } } },
    });
    const existingMembership = await transaction.eventCommandGroupAtomicUnit.findUnique({ where: { atomicEventUnitId: normalizedAtomicId }, select: { groupId: true } });
    if (group === null || atomicUnit === null) throw new EventCommandGroupError("Command group or atomic Event-unit not found.");
    if (atomicUnit.eventParticipation.eventId !== eventId) {
      throw new EventCommandGroupError("Atomic Event-unit must belong to the same Event.");
    }
    if (group.side !== null && atomicUnit.side !== null && group.side !== atomicUnit.side) {
      throw new EventCommandGroupError("Atomic Event-units and parent groups must use the same battlefield side.");
    }
    if (existingMembership !== null) {
      throw new EventCommandGroupError("Atomic Event-unit already has a parent group.");
    }
    return transaction.eventCommandGroupAtomicUnit.create({
      data: { groupId: normalizedGroupId, atomicEventUnitId: normalizedAtomicId },
    });
  });
}

export async function detachAtomicEventUnit(
  userId: string,
  groupId: string,
  atomicEventUnitId: string,
) {
  const normalizedGroupId = requiredId(groupId, "Command group");
  const normalizedAtomicId = requiredId(atomicEventUnitId, "Atomic Event-unit");
  const eventId = await eventIdForGroup(normalizedGroupId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    const membership = await transaction.eventCommandGroupAtomicUnit.findUnique({
      where: { atomicEventUnitId: normalizedAtomicId },
      select: { groupId: true, atomicEventUnit: { select: { eventParticipation: { select: { eventId: true } } } } },
    });
    if (membership === null || membership.atomicEventUnit.eventParticipation.eventId !== eventId) {
      throw new EventCommandGroupError("Atomic Event-unit must belong to the same Event.");
    }
    if (membership.groupId !== normalizedGroupId) {
      throw new EventCommandGroupError("Atomic Event-unit is not a direct child of this group.");
    }
    return transaction.eventCommandGroupAtomicUnit.delete({
      where: { atomicEventUnitId: normalizedAtomicId },
    });
  });
}

export async function attachChildEventCommandGroup(
  userId: string,
  parentGroupId: string,
  childGroupId: string,
) {
  const normalizedParentId = requiredId(parentGroupId, "Parent group");
  const normalizedChildId = requiredId(childGroupId, "Child group");
  const eventId = await eventIdForGroup(normalizedParentId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    const child = await transaction.eventCommandGroup.findUnique({
      where: { id: normalizedChildId },
      select: { id: true, eventId: true, parentGroupId: true, side: true },
    });
    if (child === null || child.eventId !== eventId) {
      throw new EventCommandGroupError("Child group must belong to the same Event.");
    }
    if (child.parentGroupId !== null) throw new EventCommandGroupError("Child group already has a parent; use reparenting.");
    const parent = await transaction.eventCommandGroup.findUnique({ where: { id: normalizedParentId }, select: { side: true } });
    if (parent?.side !== null && child.side !== null && parent?.side !== child.side) {
      throw new EventCommandGroupError("Parent and child command groups must use the same battlefield side.");
    }
    await assertAcyclicReparent(transaction, eventId, normalizedChildId, normalizedParentId);
    return transaction.eventCommandGroup.update({
      where: { id: normalizedChildId },
      data: { parentGroupId: normalizedParentId },
    });
  });
}

async function assertAcyclicReparent(
  transaction: CommandGroupTransaction,
  eventId: string,
  groupId: string,
  parentGroupId: string | null,
) {
  await assertParentInEvent(transaction, eventId, parentGroupId);
  let currentParentId = parentGroupId;
  while (currentParentId !== null) {
    if (currentParentId === groupId) throw new EventCommandGroupError("A group cannot parent itself or one of its ancestors.");
    const currentParent = await transaction.eventCommandGroup.findUnique({
      where: { id: currentParentId },
      select: { parentGroupId: true },
    });
    if (currentParent === null) throw new EventCommandGroupError("Parent group must belong to the same Event.");
    currentParentId = currentParent.parentGroupId;
  }
}

export async function reparentEventCommandGroup(
  userId: string,
  groupId: string,
  parentGroupId: string | null,
) {
  const normalizedGroupId = requiredId(groupId, "Command group");
  const normalizedParentId = nullableId(parentGroupId);
  const eventId = await eventIdForGroup(normalizedGroupId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    const group = await transaction.eventCommandGroup.findUnique({
      where: { id: normalizedGroupId },
      select: { id: true, eventId: true, parentGroupId: true, side: true },
    });
    if (group === null) throw new EventCommandGroupError("Command group not found.");
    if (group.eventId !== eventId) throw new EventCommandGroupError("Command group must belong to the same Event.");
    await assertAcyclicReparent(transaction, eventId, normalizedGroupId, normalizedParentId);
    await assertParentSide(transaction, normalizedParentId, group.side);
    return transaction.eventCommandGroup.update({
      where: { id: normalizedGroupId },
      data: { parentGroupId: normalizedParentId },
    });
  });
}

export async function deleteEventCommandGroup(userId: string, groupId: string) {
  const normalizedGroupId = requiredId(groupId, "Command group");
  const eventId = await eventIdForGroup(normalizedGroupId);
  return authorizedEventMutation(userId, eventId, async (transaction) => {
    const group = await transaction.eventCommandGroup.findUnique({
      where: { id: normalizedGroupId },
      select: { id: true, parentGroupId: true },
    });
    if (group === null) throw new EventCommandGroupError("Command group not found.");
    await transaction.eventCommandGroup.updateMany({
      where: { parentGroupId: normalizedGroupId },
      data: { parentGroupId: group.parentGroupId },
    });
    await transaction.eventCommandGroupAtomicUnit.deleteMany({
      where: { groupId: normalizedGroupId },
    });
    return transaction.eventCommandGroup.delete({ where: { id: normalizedGroupId } });
  });
}

export type CommandTreeAtomicUnit = {
  id: string;
  name: string | null;
  side: BattlefieldSide | null;
  auditUnitType: AuditUnitType | null;
  isMandatory: boolean;
  createdAt: Date;
  persistentUnitName: string;
  unitType: string | null;
};

export type PublicEventCommandGroup = {
  id: string;
  name: string;
  side: BattlefieldSide | null;
  participationId: string | null;
  representedUnit: { id: string; name: string };
  commanderPlayerId: string;
  atomicUnits: CommandTreeAtomicUnit[];
  children: PublicEventCommandGroup[];
};

export async function getPublicEventCommandStructure(eventId: string) {
  const normalizedEventId = eventId.trim();
  if (normalizedEventId === "") return null;
  const [event, groups, ungroupedAtomicUnits] = await Promise.all([
    prisma.event.findUnique({ where: { id: normalizedEventId }, select: { id: true, name: true } }),
    prisma.eventCommandGroup.findMany({
      where: { eventId: normalizedEventId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        side: true,
        parentGroupId: true,
        eventParticipation: { select: { id: true, unit: { select: { id: true, name: true } } } },
        commanderPlayer: { select: { playerId: true } },
        atomicUnitMemberships: {
          orderBy: [{ createdAt: "asc" }, { atomicEventUnitId: "asc" }],
          select: {
            atomicEventUnit: {
              select: {
                id: true,
                name: true,
                side: true,
                auditUnitType: true,
                isMandatory: true,
                createdAt: true,
                eventParticipation: { select: { unit: { select: { name: true } } } },
                audit: { select: { lifecycle: true, unitType: true } },
              },
            },
          },
        },
      },
    }),
    prisma.atomicEventUnit.findMany({
      where: { eventParticipation: { eventId: normalizedEventId }, commandGroupMembership: { is: null } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        side: true,
        auditUnitType: true,
        isMandatory: true,
        createdAt: true,
        eventParticipation: { select: { unit: { select: { name: true } } } },
        audit: { select: { lifecycle: true, unitType: true } },
      },
    }),
  ]);
  if (event === null) return null;

  const nodeById = new Map<string, PublicEventCommandGroup>();
  for (const group of groups) {
    nodeById.set(group.id, {
      id: group.id,
      name: group.name,
      side: group.side,
      participationId: group.eventParticipation?.id ?? null,
      representedUnit: group.eventParticipation?.unit ?? { id: "", name: "Unconfigured Unit" },
      commanderPlayerId: group.commanderPlayer.playerId,
      atomicUnits: group.atomicUnitMemberships.map(({ atomicEventUnit }) => ({
        id: atomicEventUnit.id,
        name: atomicEventUnit.name,
        side: atomicEventUnit.side,
        auditUnitType: atomicEventUnit.auditUnitType,
        isMandatory: atomicEventUnit.isMandatory,
        createdAt: atomicEventUnit.createdAt,
        persistentUnitName: atomicEventUnit.eventParticipation.unit.name,
        unitType: atomicEventUnit.audit?.lifecycle === "FINAL" ? atomicEventUnit.audit.unitType : null,
      })),
      children: [],
    });
  }
  const roots: PublicEventCommandGroup[] = [];
  for (const group of groups) {
    const node = nodeById.get(group.id);
    if (node === undefined) continue;
    if (group.parentGroupId === null) {
      roots.push(node);
      continue;
    }
    const parent = nodeById.get(group.parentGroupId);
    if (parent === undefined) throw new EventCommandGroupError("Child groups must belong to the same Event.");
    parent.children.push(node);
  }
  const visited = new Set<string>();
  const visit = (group: PublicEventCommandGroup) => {
    if (visited.has(group.id)) throw new EventCommandGroupError("Command groups cannot contain cycles.");
    visited.add(group.id);
    for (const child of group.children) visit(child);
  };
  for (const root of roots) visit(root);
  if (visited.size !== groups.length) throw new EventCommandGroupError("Command groups cannot contain cycles.");

  const atomicRead = (atomicUnit: (typeof ungroupedAtomicUnits)[number]): CommandTreeAtomicUnit => ({
    id: atomicUnit.id,
    name: atomicUnit.name,
    side: atomicUnit.side,
    auditUnitType: atomicUnit.auditUnitType,
    isMandatory: atomicUnit.isMandatory,
    createdAt: atomicUnit.createdAt,
    persistentUnitName: atomicUnit.eventParticipation.unit.name,
    unitType: atomicUnit.audit?.lifecycle === "FINAL" ? atomicUnit.audit.unitType : null,
  });

  return {
    event,
    groups: roots,
    ungroupedAtomicUnits: ungroupedAtomicUnits.map(atomicRead),
  };
}

export async function getUniqueDescendantAtomicUnits(
  groupId: string,
): Promise<CommandTreeAtomicUnit[]> {
  const normalizedGroupId = groupId.trim();
  if (normalizedGroupId === "") return [];
  const group = await prisma.eventCommandGroup.findUnique({
    where: { id: normalizedGroupId },
    select: { eventId: true },
  });
  if (group === null) return [];
  const structure = await getPublicEventCommandStructure(group.eventId);
  if (structure === null) return [];
  const byId = new Map<string, PublicEventCommandGroup>();
  const index = (node: PublicEventCommandGroup) => {
    byId.set(node.id, node);
    for (const child of node.children) index(child);
  };
  for (const root of structure.groups) index(root);
  const selected = byId.get(normalizedGroupId);
  if (selected === undefined) return [];

  const unique = new Map<string, CommandTreeAtomicUnit>();
  const collect = (node: PublicEventCommandGroup) => {
    for (const atomicUnit of node.atomicUnits) unique.set(atomicUnit.id, atomicUnit);
    for (const child of node.children) collect(child);
  };
  collect(selected);
  return [...unique.values()];
}

export async function getEventCommandGroupManagementOptions(eventId: string) {
  const normalizedEventId = eventId.trim();
  if (normalizedEventId === "") return null;
  const event = await prisma.event.findUnique({ where: { id: normalizedEventId }, select: { id: true } });
  if (event === null) return null;
  const [groups, participations, players, atomicUnits] = await Promise.all([
    prisma.eventCommandGroup.findMany({ where: { eventId: normalizedEventId }, orderBy: { name: "asc" }, select: { id: true, name: true, parentGroupId: true, side: true } }),
    prisma.eventParticipation.findMany({ where: { eventId: normalizedEventId, status: "APPROVED" }, orderBy: { createdAt: "asc" }, select: { id: true, unitId: true, unit: { select: { id: true, name: true } } } }),
    prisma.player.findMany({ orderBy: { playerId: "asc" }, select: { id: true, playerId: true } }),
    prisma.atomicEventUnit.findMany({
      where: { eventParticipation: { eventId: normalizedEventId } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        side: true,
        auditUnitType: true,
        commandGroupMembership: { select: { groupId: true } },
        eventParticipation: { select: { unit: { select: { name: true } } } },
      },
    }),
  ]);
  return {
    groups,
    participations,
    units: participations.map(({ unit }) => unit),
    players,
    atomicUnits: atomicUnits.map((unit) => ({
      id: unit.id,
      name: unit.name,
      side: unit.side,
      auditUnitType: unit.auditUnitType,
      commandGroupId: unit.commandGroupMembership?.groupId ?? null,
      representedUnitName: unit.eventParticipation.unit.name,
    })),
  };
}

async function approvedParticipationForEvent(
  transaction: CommandGroupTransaction,
  eventId: string,
  participationId: string | null,
  representedUnitId: string | null,
) {
  const participation = participationId !== null
    ? await transaction.eventParticipation.findUnique({
        where: { id: participationId },
        select: { id: true, eventId: true, unitId: true, status: true },
      })
    : representedUnitId === null
      ? null
      : await transaction.eventParticipation.findFirst({
          where: { eventId, unitId: representedUnitId, status: "APPROVED" },
          select: { id: true, eventId: true, unitId: true, status: true },
        });
  if (participation === null || participation.eventId !== eventId || participation.status !== "APPROVED") {
    throw new EventCommandGroupError("An approved EventParticipation from this Event is required.");
  }
  return participation;
}

async function assertParentSide(
  transaction: CommandGroupTransaction,
  parentGroupId: string | null,
  side: BattlefieldSide | null,
) {
  if (parentGroupId === null || side === null) return;
  const parent = await transaction.eventCommandGroup.findUnique({ where: { id: parentGroupId }, select: { side: true } });
  if (parent?.side !== null && parent?.side !== side) {
    throw new EventCommandGroupError("Parent and child command groups must use the same battlefield side.");
  }
}