export const STATISTICS_WINDOWS = ["14d", "30d", "all-time"] as const;

export type StatisticsWindow = (typeof STATISTICS_WINDOWS)[number];

export const DEFAULT_STATISTICS_WINDOW: StatisticsWindow = "14d";

export type StatisticsWindowRange = {
  window: StatisticsWindow;
  start: Date | null;
  end: Date | null;
};

const WINDOW_LENGTHS_MS: Record<Exclude<StatisticsWindow, "all-time">, number> = {
  "14d": 14 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function getStatisticsWindowRange(
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
  now: Date = new Date(),
): StatisticsWindowRange {
  if (window === "all-time") return { window, start: null, end: null };
  const end = new Date(now.getTime());
  return {
    window,
    start: new Date(end.getTime() - WINDOW_LENGTHS_MS[window]),
    end,
  };
}

export function isEventTimeInStatisticsWindow(
  occurredAt: Date,
  range: StatisticsWindowRange,
): boolean {
  if (range.start === null || range.end === null) return true;
  const occurredAtMs = occurredAt.getTime();
  return occurredAtMs >= range.start.getTime() && occurredAtMs <= range.end.getTime();
}
