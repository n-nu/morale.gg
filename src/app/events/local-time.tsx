"use client";

import {
  formatEventDateUTC,
  formatEventTimeUTC,
} from "@/modules/events/presentation";

import { useIsClient } from "./use-is-client";

type Mode = "card" | "full" | "time";

function formatLocal(date: Date, mode: Mode): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  if (mode === "time") {
    return time;
  }
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: mode === "full" ? "numeric" : undefined,
  });
  return `${datePart} · ${time}`;
}

/**
 * Renders an event time in the visitor's local time zone. The server render
 * shows UTC and is replaced on the client, so static output stays
 * deterministic while people see their own time.
 */
export function LocalDateTime({ iso, mode = "card" }: { iso: string; mode?: Mode }) {
  const isClient = useIsClient();
  const date = new Date(iso);
  const text = isClient
    ? formatLocal(date, mode)
    : mode === "time"
      ? formatEventTimeUTC(date)
      : `${formatEventDateUTC(date)} · ${formatEventTimeUTC(date)}`;
  return <span suppressHydrationWarning>{text}</span>;
}

function localZoneName(): string | null {
  try {
    const now = new Date();
    const long = now
      .toLocaleTimeString("en-US", { timeZoneName: "long" })
      .split(" ")
      .slice(2)
      .join(" ");
    const short = now
      .toLocaleTimeString("en-US", { timeZoneName: "short" })
      .split(" ")
      .slice(2)
      .join(" ");
    return long && short ? `${long} (${short})` : null;
  } catch {
    return null;
  }
}

/** "All times are shown in your local time zone — Central Daylight Time (CDT)" */
export function TimezoneNote() {
  const isClient = useIsClient();
  const zone = isClient ? localZoneName() : null;

  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" suppressHydrationWarning>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
      </svg>
      <span>
        All times are shown in your local time zone
        {zone ? ` — ${zone}` : ""}
      </span>
    </span>
  );
}
