"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createEvent } from "@/modules/events/server/create-event";

/**
 * Creates an Event through the existing authenticated creation path, which
 * resolves the session and enforces `canCreateEvent` (Units' MANAGE_EVENTS
 * capability) server-side. Lands on the new event's management page, or back
 * on the form with an ?error= banner.
 */
export async function createEventAction(formData: FormData): Promise<void> {
  const scheduledAtIso = String(formData.get("scheduledAtIso") ?? "");

  let errorMessage: string | null = null;
  let createdEventId: string | null = null;

  try {
    const event = await createEvent({
      name: String(formData.get("name") ?? ""),
      scheduledAt: new Date(scheduledAtIso),
      eventType: String(formData.get("eventType") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      opponent: String(formData.get("opponent") ?? "") || undefined,
      map: String(formData.get("map") ?? "") || undefined,
    });
    createdEventId = event.id;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Something went wrong.";
  }

  if (errorMessage !== null || createdEventId === null) {
    redirect(
      `/events/create?error=${encodeURIComponent(errorMessage ?? "Something went wrong.")}`,
    );
  }

  revalidatePath("/events");
  revalidatePath("/events/calendar");
  revalidatePath("/events/manage");
  redirect(
    `/events/${createdEventId}/manage?notice=${encodeURIComponent("Event created.")}`,
  );
}
