"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { revokeEventUser } from "@/modules/events/server/authorization";
import {
  approveEventParticipation,
  denyEventParticipation,
} from "@/modules/events/server/event-participation";
import {
  authorizeEventUserByEmail,
  updateEventDetails,
} from "@/modules/events/server/management";

function managePath(eventId: string): string {
  return `/events/${eventId}/manage`;
}

/**
 * Runs one management operation and lands back on the management page with a
 * ?notice= or ?error= banner. Authorization itself is enforced server-side in
 * the events module; these actions only resolve the session and present
 * outcomes.
 */
async function runManageAction(
  eventId: string,
  notice: string,
  operation: (userId: string) => Promise<void>,
): Promise<never> {
  let errorMessage: string | null = null;

  const userId = await getAuthenticatedUserId();
  if (userId === null) {
    errorMessage = "Sign in to manage this event.";
  } else {
    try {
      await operation(userId);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Something went wrong.";
    }
  }

  if (errorMessage !== null) {
    redirect(`${managePath(eventId)}?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath(managePath(eventId));
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events/manage");
  redirect(`${managePath(eventId)}?notice=${encodeURIComponent(notice)}`);
}

export async function updateEventDetailsAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const scheduledAtIso = String(formData.get("scheduledAtIso") ?? "");

  await runManageAction(eventId, "Event details saved.", async (userId) => {
    await updateEventDetails(userId, eventId, {
      name: String(formData.get("name") ?? ""),
      scheduledAt: new Date(scheduledAtIso),
      eventType: String(formData.get("eventType") ?? ""),
      description: String(formData.get("description") ?? ""),
      opponent: String(formData.get("opponent") ?? ""),
      map: String(formData.get("map") ?? ""),
    });
  });
}

export async function addManagerAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const email = String(formData.get("email") ?? "");

  await runManageAction(eventId, "Event manager added.", async (userId) => {
    await authorizeEventUserByEmail(userId, eventId, email);
  });
}

export async function revokeManagerAction(
  eventId: string,
  managerUserId: string,
): Promise<void> {
  await runManageAction(eventId, "Event manager removed.", async (userId) => {
    await revokeEventUser(userId, eventId, managerUserId);
  });
}

export async function approveParticipationAction(
  eventId: string,
  participationId: string,
  formData: FormData,
): Promise<void> {
  const team = String(formData.get("team") ?? "");
  await runManageAction(eventId, "Participation approved.", async (userId) => {
    await approveEventParticipation(userId, participationId, team);
  });
}

export async function denyParticipationAction(
  eventId: string,
  participationId: string,
): Promise<void> {
  await runManageAction(eventId, "Participation denied.", async (userId) => {
    await denyEventParticipation(userId, participationId);
  });
}
