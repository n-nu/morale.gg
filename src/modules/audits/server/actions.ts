"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUserId } from "@/lib/website-admin";

import {
  createAtomicEventUnit,
  deleteAtomicEventUnit,
} from "./atomic-units";

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
