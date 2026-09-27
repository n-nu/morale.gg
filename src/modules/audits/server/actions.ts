"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUserId } from "@/lib/website-admin";

import {
  createAtomicEventUnit,
  deleteAtomicEventUnit,
} from "./atomic-units";
import {
  attachAtomicEventUnit,
  attachChildEventCommandGroup,
  createEventCommandGroup,
  deleteEventCommandGroup,
  detachAtomicEventUnit,
  reparentEventCommandGroup,
  updateEventCommandGroup,
} from "./command-groups";
import { createAuditDraftForAtomicUnit, submitAudit } from "./submission";

async function requireAuthenticatedUser(message: string) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error(message);
  return userId;
}

function revalidateCommandStructure(eventId: string) {
  revalidatePath(`/events/${eventId}/command-structure`);
  revalidatePath(`/events/${eventId}`);
}

function numericFormValue(data: FormData, name: string): number {
  const value = String(data.get(name) ?? "").trim();
  return value === "" ? Number.NaN : Number(value);
}

export async function createAtomicEventUnitAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to manage atomic Event-units.");

  await createAtomicEventUnit({
    userId,
    participationId: String(data.get("participationId") ?? ""),
    isMandatory: data.get("isMandatory") === "true",
  });
  revalidatePath("/audits");
}

export async function deleteAtomicEventUnitAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to manage atomic Event-units.");

  await deleteAtomicEventUnit(userId, String(data.get("atomicEventUnitId") ?? ""));
  revalidatePath("/audits");
}

export async function createAuditDraftAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to create an Audit draft.");

  await createAuditDraftForAtomicUnit({
    userId,
    atomicEventUnitId: String(data.get("atomicEventUnitId") ?? ""),
  });
  revalidatePath("/audits");
}

export async function submitAuditAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to submit an Audit.");

  const unitType = String(data.get("unitType") ?? "").toUpperCase() as "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY";
  const commanderPlayerId = String(data.get("commanderPlayerId") ?? "").trim();
  const flagBearerPlayerId = String(data.get("flagBearerPlayerId") ?? "").trim();

  await submitAudit({
    userId,
    auditId: String(data.get("auditId") ?? ""),
    submission: {
      rawData: String(data.get("rawData") ?? ""),
      unitType,
      tickets: numericFormValue(data, "tickets"),
      flagCaptures: numericFormValue(data, "flagCaptures"),
      flagLosses: numericFormValue(data, "flagLosses"),
      stars: numericFormValue(data, "stars"),
      roles: [
        { playerId: commanderPlayerId, role: "COMMANDER" },
        ...(flagBearerPlayerId ? [{ playerId: flagBearerPlayerId, role: "FLAG_BEARER" as const }] : []),
      ],
    },
  });
  revalidatePath("/audits");
}

export async function createEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await createEventCommandGroup(userId, eventId, {
    name: String(data.get("name") ?? ""),
    representedUnitId: String(data.get("representedUnitId") ?? ""),
    commanderPlayerId: String(data.get("commanderPlayerId") ?? ""),
    parentGroupId: String(data.get("parentGroupId") ?? ""),
  });
  revalidateCommandStructure(eventId);
}

export async function updateEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const groupId = String(data.get("groupId") ?? "");
  await updateEventCommandGroup(userId, groupId, {
    name: String(data.get("name") ?? ""),
    representedUnitId: String(data.get("representedUnitId") ?? ""),
    commanderPlayerId: String(data.get("commanderPlayerId") ?? ""),
  });
  revalidateCommandStructure(String(data.get("eventId") ?? ""));
}

export async function attachAtomicEventUnitAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await attachAtomicEventUnit(userId, String(data.get("groupId") ?? ""), String(data.get("atomicEventUnitId") ?? ""));
  revalidateCommandStructure(eventId);
}

export async function detachAtomicEventUnitAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await detachAtomicEventUnit(userId, String(data.get("groupId") ?? ""), String(data.get("atomicEventUnitId") ?? ""));
  revalidateCommandStructure(eventId);
}

export async function attachChildEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await attachChildEventCommandGroup(userId, String(data.get("parentGroupId") ?? ""), String(data.get("childGroupId") ?? ""));
  revalidateCommandStructure(eventId);
}

export async function reparentEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await reparentEventCommandGroup(userId, String(data.get("groupId") ?? ""), String(data.get("parentGroupId") ?? ""));
  revalidateCommandStructure(eventId);
}

export async function deleteEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await deleteEventCommandGroup(userId, String(data.get("groupId") ?? ""));
  revalidateCommandStructure(eventId);
}
