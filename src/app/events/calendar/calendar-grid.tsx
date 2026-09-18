"use client";

import Link from "next/link";

import { eventTypeStyle } from "@/modules/events/presentation";

import { useIsClient } from "../use-is-client";

export interface CalendarEvent {
  id: string;
  name: string;
  iso: string;
  eventType: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Month grid rendered on the client so days and times follow the visitor's
 * own time zone. Until it mounts, a skeleton holds the layout.
 */
export function CalendarGrid({
  year,
  month,
  events,
}: {
  year: number;
  /** 1-12 */
  month: number;
  events: CalendarEvent[];
}) {
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <div className="h-[560px] animate-pulse rounded-lg border border-edge bg-surface" />
    );
  }

  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const buckets = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(new Date(event.iso));
    const list = buckets.get(key) ?? [];
    list.push(event);
    buckets.set(key, list);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.iso.localeCompare(b.iso));
  }

  const todayKey = dayKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-b-0 border-edge bg-surface">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-faint"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border-b border-l border-edge">
        {Array.from({ length: totalCells }, (_, i) => {
          const date = new Date(year, month - 1, 1 - startOffset + i);
          const dim = date.getMonth() !== month - 1;
          const key = dayKey(date);
          const isToday = key === todayKey;
          const chips = buckets.get(key) ?? [];
          return (
            <div
              key={i}
              className={`box-border flex min-h-[108px] flex-col gap-1.5 border-r border-t border-edge p-2 ${
                dim ? "bg-background" : "bg-surface"
              }`}
            >
              <span
                className={`self-start rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                  isToday
                    ? "bg-gold text-gold-ink"
                    : dim
                      ? "text-faint"
                      : "text-foreground"
                }`}
              >
                {date.getDate()}
              </span>
              {chips.map((event) => {
                const style = eventTypeStyle(event.eventType);
                const time = new Date(event.iso).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    title={`${time} · ${event.name}`}
                    className={`block truncate rounded border px-1.5 py-1 text-[11px] font-semibold ${style.badgeClass}`}
                  >
                    {time} · {event.name}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
