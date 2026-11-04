export function deriveEventSchedule(
  scheduledAt: Date,
  rallyMinutesBeforeStart: number,
  durationMinutes: number | null,
): { rallyAt: Date; expectedEndAt: Date | null } {
  const scheduledAtMs = scheduledAt.getTime();
  return {
    rallyAt: new Date(scheduledAtMs - rallyMinutesBeforeStart * 60_000),
    expectedEndAt:
      durationMinutes === null
        ? null
        : new Date(scheduledAtMs + durationMinutes * 60_000),
  };
}
