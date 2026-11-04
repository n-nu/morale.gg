/**
 * Client-safe presentation helpers for Events. No persistence access here —
 * server-side behavior lives under `src/modules/events/server/`.
 */

export { deriveEventSchedule } from "./schedule";

/**
 * Well-known event types get the team palette's accent treatment (colors
 * from the approved Events mockup); anything else falls back to a neutral
 * style. Presentation only — the persisted `eventType` remains a plain
 * string per the approved MVP scope.
 */
export interface EventTypeStyle {
  label: string;
  /** Normalized filter key for known and custom event types. */
  key: string;
  /** Tailwind classes for legend/filter dots. */
  dotClass: string;
  /** Tailwind classes for type badges and calendar chips (bg + border + text). */
  badgeClass: string;
  /** Tailwind classes for a card's colored left edge. */
  barClass: string;
}

/** Well-known event types, for form suggestions. Free text stays valid. */
export const EVENT_TYPE_NAMES: string[] = [
  "Internal",
  "External",
  "Mixed",
  "Grand Battle",
  "Ceremony",
  "Other",
];

export function eventTypeStyle(eventType: string): EventTypeStyle {
  const normalized = eventType.trim().toLowerCase();
  const label = eventType
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  if (normalized.includes("grand")) {
    return {
      label,
      key: "grand",
      dotClass: "bg-gold",
      badgeClass: "bg-[#1a1810] border-gold text-gold",
      barClass: "border-l-gold",
    };
  }
  switch (normalized) {
    case "ceremony":
      return {
        label,
        key: "ceremony",
        dotClass: "bg-[#c0c0c0]",
        badgeClass: "bg-[#c0c0c0] border-[#e0e0e0] text-[#202226]",
        barClass: "border-l-[#c0c0c0]",
      };
    case "internal":
      return {
        label,
        key: "internal",
        dotClass: "bg-green-bright",
        badgeClass: "bg-[#0b100f] border-type-green text-green-bright",
        barClass: "border-l-type-green",
      };
    case "external":
      return {
        label,
        key: "external",
        dotClass: "bg-type-red",
        badgeClass: "bg-[#151111] border-type-red text-type-red",
        barClass: "border-l-type-red",
      };
    case "mixed":
      return {
        label,
        key: "mixed",
        dotClass: "bg-type-blue",
        badgeClass: "bg-[#090e12] border-type-blue text-type-blue",
        barClass: "border-l-type-blue",
      };
    case "other":
      return {
        label,
        key: "other",
        dotClass: "bg-[#4b4f56]",
        badgeClass: "bg-[#292c31] border-[#4b4f56] text-[#b8bcc3]",
        barClass: "border-l-[#4b4f56]",
      };
    default:
      return {
        label,
        key: "other",
        dotClass: "bg-faint",
        badgeClass: "bg-surface-2 border-edge-strong text-muted",
        barClass: "border-l-edge-strong",
      };
  }
}

export function matchesEventTypeFilter(eventType: string, key: string): boolean {
  return eventTypeStyle(eventType).key === key;
}

export function isBattleEventType(eventType: string): boolean {
  const normalized = eventType.trim().toLowerCase();
  return normalized !== "ceremony" && normalized !== "other";
}

export function formatEventScheduleSummary(
  rallyMinutesBeforeStart: number,
  durationMinutes: number | null,
): string {
  const rally =
    rallyMinutesBeforeStart === 0
      ? "Rally at start"
      : `Rally ${rallyMinutesBeforeStart}m before`;
  const duration =
    durationMinutes === null ? "duration not set" : `${durationMinutes} min`;
  return `${rally} · ${duration}`;
}

const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const utcTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "numeric",
  minute: "2-digit",
});

/** UTC fallbacks used before client-side local time hydrates. */
export function formatEventDateUTC(scheduledAt: Date): string {
  return utcDateFormatter.format(scheduledAt);
}

export function formatEventTimeUTC(scheduledAt: Date): string {
  return `${utcTimeFormatter.format(scheduledAt)} UTC`;
}

export function isPastEvent(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() < now.getTime();
}
