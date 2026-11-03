"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { prisma } from "@/lib/prisma";
import { canSubmitAudit } from "@/modules/units/server/authorization";
import {
  AuditPlayerResolutionError,
  previewAuditPlayerIdentities,
} from "@/modules/players/server/audit-resolution";
import type { AuditPlayerIdentityPreview } from "@/modules/players/server/audit-resolution";

import {
  createAtomicEventUnit,
  createEventAtomicEventUnit,
  deleteAtomicEventUnit,
  deleteEventAtomicEventUnit,
  updateEventAtomicEventUnit,
} from "./atomic-units";
import {
  attachAtomicEventUnit,
  attachChildEventCommandGroup,
  createEventCommandGroup,
  deleteEventCommandGroup,
  detachAtomicEventUnit,
  moveEventBattlefieldNode,
  reparentEventCommandGroup,
  updateEventCommandGroup,
} from "./command-groups";
import { AuditSubmissionError, createAuditDraftForAtomicUnit, parseAuditRows, submitAudit } from "./submission";

export type AuditActionState = {
  ok: boolean;
  message: string;
  auditId?: string;
  rawData?: string;
  players?: AuditPlayerIdentityPreview[];
  invalidIds?: string[];
};

async function requireAuthenticatedUser(message: string) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error(message);
  return userId;
}

function revalidateCommandStructure(eventId: string) {
  revalidatePath(`/events/${eventId}/command-structure`);
  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
}

function numericFormValue(data: FormData, name: string): number {
  const value = String(data.get(name) ?? "").trim();
  return value === "" ? Number.NaN : Number(value);
}

export async function createAtomicEventUnitAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to manage companies.");

  await createAtomicEventUnit({
    userId,
    participationId: String(data.get("participationId") ?? ""),
    isMandatory: data.get("isMandatory") === "true",
  });
  revalidatePath("/audits");
}

export async function createEventAtomicEventUnitAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's battlefield structure.");
  const eventId = String(data.get("eventId") ?? "");
  await createEventAtomicEventUnit({
    userId,
    eventId,
    participationId: String(data.get("participationId") ?? ""),
    name: String(data.get("name") ?? ""),
    side: String(data.get("side") ?? "").trim() === ""
      ? null
      : String(data.get("side")) as "ATTACKER" | "DEFENDER",
    auditUnitType: String(data.get("auditUnitType") ?? "") as "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY",
    isMandatory: data.get("isMandatory") === "true",
  });
  revalidateCommandStructure(eventId);
}

export async function updateEventAtomicEventUnitAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's battlefield structure.");
  const eventId = String(data.get("eventId") ?? "");
  await updateEventAtomicEventUnit(userId, {
    eventId,
    atomicEventUnitId: String(data.get("atomicEventUnitId") ?? ""),
    participationId: String(data.get("participationId") ?? ""),
    name: String(data.get("name") ?? ""),
    side: String(data.get("side") ?? "").trim() === ""
      ? null
      : String(data.get("side")) as "ATTACKER" | "DEFENDER",
    auditUnitType: String(data.get("auditUnitType") ?? "") as "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY",
    isMandatory: data.get("isMandatory") === "true",
  });
  revalidateCommandStructure(eventId);
}

export async function deleteEventAtomicEventUnitAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's battlefield structure.");
  const eventId = String(data.get("eventId") ?? "");
  await deleteEventAtomicEventUnit(userId, eventId, String(data.get("atomicEventUnitId") ?? ""));
  revalidateCommandStructure(eventId);
}

export async function deleteAtomicEventUnitAction(data: FormData) {
  const userId = await getAuthenticatedUserId();
  if (userId === null) throw new Error("Sign in to manage companies.");

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

async function auditActionResult(
  operation: () => Promise<AuditActionState>,
): Promise<AuditActionState> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AuditSubmissionError) return { ok: false, message: error.message };
    if (error instanceof AuditPlayerResolutionError) return { ok: false, message: error.message };
    console.error("Audit Player identity operation failed", error);
    return { ok: false, message: "Unable to verify or submit this Audit right now. Please retry." };
  }
}

export async function previewAuditPlayersAction(
  _previous: AuditActionState,
  data: FormData,
) {
  return auditActionResult(async () => {
    const userId = await getAuthenticatedUserId();
    if (userId === null) throw new AuditSubmissionError("Sign in to verify Audit Players.");

    const auditId = String(data.get("auditId") ?? "").trim();
    const rawData = String(data.get("rawData") ?? "");
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: {
        id: true,
        lifecycle: true,
        createdByUserId: true,
        atomicEventUnit: {
          select: { eventParticipation: { select: { unitId: true, status: true } } },
        },
      },
    });
    if (!audit || audit.lifecycle !== "DRAFT" || !audit.atomicEventUnit?.eventParticipation) {
      throw new AuditSubmissionError("Audit draft not found.");
    }
    if (audit.createdByUserId !== userId) {
      throw new AuditSubmissionError("Only the creator may verify and edit this Audit draft.");
    }
    const participation = audit.atomicEventUnit.eventParticipation;
    if (participation.status !== "APPROVED" || !(await canSubmitAudit(userId, participation.unitId))) {
      throw new AuditSubmissionError("Unauthorized: user cannot submit an Audit for this Unit.");
    }

    const rows = parseAuditRows(rawData);
    const preview = await previewAuditPlayerIdentities(rows.map((row) => row.playerId));
    const message = preview.invalidIds.length > 0
      ? `Roblox could not find Player ID${preview.invalidIds.length === 1 ? "" : "s"}: ${preview.invalidIds.join(", ")}. Correct the ID${preview.invalidIds.length === 1 ? "" : "s"} before finalizing.`
      : preview.unavailable
        ? "Roblox is unavailable. Existing Players remain usable from cache; new Player IDs must be retried."
        : "Review the Roblox identities before finalizing this Audit.";
    return {
      ok: preview.invalidIds.length === 0,
      message,
      auditId,
      rawData,
      players: preview.players,
      invalidIds: preview.invalidIds,
    };
  });
}

export async function submitAuditAction(
  _previous: AuditActionState,
  data: FormData,
) {
  return auditActionResult(async () => {
    const userId = await getAuthenticatedUserId();
    if (userId === null) throw new AuditSubmissionError("Sign in to submit an Audit.");

    const rawData = String(data.get("rawData") ?? "");
    if (
      String(data.get("verifiedRawData") ?? "") !== rawData ||
      String(data.get("verifiedAuditId") ?? "") !== String(data.get("auditId") ?? "")
    ) {
      throw new AuditSubmissionError("Preview and confirm the current Roblox identities before finalizing.");
    }

    const unitType = String(data.get("unitType") ?? "").toUpperCase() as "REGULAR" | "RIFLES" | "CAVALRY" | "ARTILLERY";
    const commanderPlayerId = String(data.get("commanderPlayerId") ?? "").trim();
    const flagBearerPlayerId = String(data.get("flagBearerPlayerId") ?? "").trim();

    await submitAudit({
      userId,
      auditId: String(data.get("auditId") ?? ""),
      submission: {
        rawData,
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
    return { ok: true, message: "Audit finalized." };
  });
}

export async function createEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const eventId = String(data.get("eventId") ?? "");
  await createEventCommandGroup(userId, eventId, {
    name: String(data.get("name") ?? ""),
    participationId: String(data.get("participationId") ?? ""),
    side: String(data.get("side") ?? "").trim() === ""
      ? null
      : String(data.get("side")) as "ATTACKER" | "DEFENDER",
    commanderPlayerId: String(data.get("commanderPlayerId") ?? ""),
    parentGroupId: String(data.get("parentGroupId") ?? ""),
  });
  revalidateCommandStructure(eventId);
}

export async function moveEventBattlefieldNodeAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's battlefield structure.");
  const eventId = String(data.get("eventId") ?? "");
  const nodeType = String(data.get("nodeType") ?? "");
  const nodeId = String(data.get("nodeId") ?? "");
  const destination = String(data.get("destination") ?? "");
  if (nodeType !== "group" && nodeType !== "atomic") {
    throw new Error("Select a valid battlefield node.");
  }
  const target = destination.startsWith("group:")
    ? { groupId: destination.slice("group:".length) }
    : destination === "side:UNSORTED"
      ? { side: null }
      : destination === "side:ATTACKER" || destination === "side:DEFENDER"
        ? { side: destination.slice("side:".length) as "ATTACKER" | "DEFENDER" }
        : null;
  if (target === null) throw new Error("Select a valid battlefield destination.");
  await moveEventBattlefieldNode(
    userId,
    eventId,
    { type: nodeType, id: nodeId },
    target,
  );
  revalidateCommandStructure(eventId);
}

export async function updateEventCommandGroupAction(data: FormData) {
  const userId = await requireAuthenticatedUser("Sign in to manage this Event's command structure.");
  const groupId = String(data.get("groupId") ?? "");
  await updateEventCommandGroup(userId, groupId, {
    name: String(data.get("name") ?? ""),
    participationId: String(data.get("participationId") ?? ""),
    side: String(data.get("side") ?? "").trim() === ""
      ? null
      : String(data.get("side")) as "ATTACKER" | "DEFENDER",
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
