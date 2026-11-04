import type { EventInvitePolicy } from "@prisma/client";

export const MAX_RALLY_MINUTES_BEFORE_START = 24 * 60;
export const MAX_EVENT_DURATION_MINUTES = 24 * 60;
export const MAX_EVENT_SIDE_NAME_LENGTH = 120;

const MINUTE_MS = 60_000;

export function validateEventSchedule(
  scheduledAt: Date,
  rallyMinutesBeforeStart: unknown,
  durationMinutes: unknown,
): void {
  const startTime = scheduledAt.getTime();
  if (!Number.isFinite(startTime)) {
    throw new Error("An event needs a valid scheduled date and time.");
  }

  if (
    typeof rallyMinutesBeforeStart !== "number" ||
    !Number.isInteger(rallyMinutesBeforeStart) ||
    rallyMinutesBeforeStart < 0 ||
    rallyMinutesBeforeStart > MAX_RALLY_MINUTES_BEFORE_START
  ) {
    throw new Error(
      `Rally time must be a whole number between 0 and ${MAX_RALLY_MINUTES_BEFORE_START} minutes.`,
    );
  }

  if (
    typeof durationMinutes !== "number" ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > MAX_EVENT_DURATION_MINUTES
  ) {
    throw new Error(
      `Event duration must be a whole number between 1 and ${MAX_EVENT_DURATION_MINUTES} minutes.`,
    );
  }

  const rallyTime = startTime - rallyMinutesBeforeStart * MINUTE_MS;
  const expectedEnd = startTime + durationMinutes * MINUTE_MS;
  if (
    !Number.isFinite(new Date(rallyTime).getTime()) ||
    !Number.isFinite(new Date(expectedEnd).getTime())
  ) {
    throw new Error("The rally or expected end time is outside the supported date range.");
  }
}

export function validateEventInvitePolicy(value: unknown): EventInvitePolicy {
  if (value !== "OPEN" && value !== "CLOSED") {
    throw new Error("Invite policy must be Open Invite or Closed Invite.");
  }

  return value;
}

export function normalizeEventSideName(value: string | undefined): string | null {
  const name = value?.trim() ?? "";
  if (name.length > MAX_EVENT_SIDE_NAME_LENGTH) {
    throw new Error(`Event side names must be ${MAX_EVENT_SIDE_NAME_LENGTH} characters or fewer.`);
  }
  return name || null;
}
