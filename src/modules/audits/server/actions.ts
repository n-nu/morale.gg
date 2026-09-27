"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUserId } from "@/lib/website-admin";

import {
  createAtomicEventUnit,
  deleteAtomicEventUnit,
} from "./atomic-units";
import { createAuditDraftForAtomicUnit, submitAudit } from "./submission";

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
