"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { bannerArtFor } from "@/modules/events/map-art";
import { eventTypeStyle } from "@/modules/events/presentation";

import { useIsClient } from "../use-is-client";

export interface CalendarEvent {
  id: string;
  name: string;
  iso: string;
  eventType: string;
  opponent: string | null;
  map: string | null;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * "Dispatch board" calendar: a compact month navigator (day numbers with
 * event dots — no grid boxes) beside the month's events as full dispatch
 * cards. Rendered on the client so days and times follow the visitor's own
 * time zone; until it mounts, a skeleton holds the layout.
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="h-[420px] flex-1 animate-pulse rounded-xl border border-edge bg-surface" />
        <div className="h-[320px] animate-pulse rounded-xl border border-edge bg-surface lg:w-[430px]" />
      </div>
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

  const todayKey = dayKey(new Date());

  const monthKeyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthKey = monthKeyOf(new Date(year, month - 2, 1));
  const nextMonthKey = monthKeyOf(new Date(year, month, 1));
  const monthTitle = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthEvents = events
    .filter((event) => {
      const date = new Date(event.iso);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    })
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const now = Date.now();
  const selectedEvents =
    selectedDay === null
      ? null
      : monthEvents.filter((event) => dayKey(new Date(event.iso)) === selectedDay);
  const listedEvents =
    selectedEvents ??
    monthEvents.filter((event) => new Date(event.iso).getTime() >= now);
  const selectedDayLabel = (() => {
    if (selectedDay === null) return null;
    const [selectedYear, selectedMonthIndex, selectedDate] = selectedDay
      .split("-")
      .map(Number);
    return new Date(selectedYear, selectedMonthIndex, selectedDate).toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric" },
    );
  })();

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="min-w-0 flex-1 lg:order-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            {selectedDayLabel ?? "Upcoming engagements"}
          </div>
          {selectedDay !== null ? (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-bold text-gold transition-colors hover:text-gold-bright"
            >
              ← Back to upcoming
            </button>
          ) : null}
        </div>

        {listedEvents.length === 0 ? (
          <div className="mt-3.5 rounded-xl border border-edge bg-surface px-6 py-12 text-center">
            <p className="font-bold text-white">
              {selectedDay !== null
                ? "No engagements on this day."
                : "No upcoming engagements this month."}
            </p>
            <p className="mt-2 text-sm text-muted">
              {selectedDay !== null
                ? "Pick another marked day in the calendar."
                : "Select a marked day in the calendar to revisit past engagements, or browse months with the arrows."}
            </p>
          </div>
        ) : (
          <ul className="mt-3.5 flex flex-col gap-3.5">
            {listedEvents.map((event) => {
              const style = eventTypeStyle(event.eventType);
              const art = bannerArtFor(event.map, event.name);
              const date = new Date(event.iso);
              const weekday = date
                .toLocaleDateString("en-US", { weekday: "short" })
                .toUpperCase();
              const monthAbbrev = date
                .toLocaleDateString("en-US", { month: "short" })
                .toUpperCase();
              const time = date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              });
              const isGrand = style.key === "grand";

              const dateBlock = (
                <div className="w-[76px] flex-shrink-0 text-center">
                  <div className="text-[11px] font-bold tracking-[0.1em] text-faint">
                    {weekday}
                  </div>
                  <div className="text-[32px] font-extrabold leading-tight text-white">
                    {date.getDate()}
                  </div>
                  <div
                    className={`text-[11px] font-bold tracking-[0.1em] ${style.badgeClass.split(" ").pop()}`}
                  >
                    {monthAbbrev}
                  </div>
                </div>
              );

              const meta = [time, event.opponent ? `vs ${event.opponent}` : null, event.map]
                .filter(Boolean)
                .join(" · ");

              if (isGrand) {
                return (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.id}`}
                      className={`relative block overflow-hidden rounded-xl border border-edge border-l-[3px] transition-colors hover:border-edge-strong ${style.barClass}`}
                    >
                      <Image
                        src={art.src}
                        alt={art.alt}
                        fill
                        sizes="(max-width: 1280px) 100vw, 820px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-[rgba(8,9,11,0.66)]" />
                      <div className="relative flex items-center gap-5 px-5 py-4">
                        {dateBlock}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[19px] font-extrabold text-white">
                            {event.name}
                          </div>
                          <div className="mt-0.5 truncate text-[13px] text-[#d8d6ce]">
                            {meta}
                          </div>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${style.badgeClass}`}
                        >
                          {style.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className={`flex items-center gap-5 rounded-xl border border-edge border-l-[3px] bg-surface px-5 py-3.5 transition-colors hover:border-edge-strong ${style.barClass}`}
                  >
                    {dateBlock}
                    <div className="relative hidden h-[76px] w-[152px] flex-shrink-0 overflow-hidden rounded-lg sm:block">
                      <Image
                        src={art.src}
                        alt={art.alt}
                        fill
                        sizes="152px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-extrabold text-white">
                        {event.name}
                      </div>
                      <div className="mt-0.5 truncate text-[13px] text-muted">
                        {meta}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${style.badgeClass}`}
                    >
                      {style.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="flex-shrink-0 lg:order-2 lg:w-[430px]">
        <div className="rounded-xl border border-edge bg-surface px-5 py-4.5">
          <div className="mb-3 flex items-center justify-between border-b border-edge pb-3">
            <Link
              href={`/events/calendar?m=${prevMonthKey}`}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge-strong text-muted transition-colors hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <span className="text-sm font-extrabold text-white">{monthTitle}</span>
            <Link
              href={`/events/calendar?m=${nextMonthKey}`}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge-strong text-muted transition-colors hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={`${weekday}-${index}`}
                className="text-[10px] font-bold tracking-[0.1em] text-faint"
              >
                {weekday}
              </span>
            ))}
            {Array.from({ length: totalCells }, (_, i) => {
              const date = new Date(year, month - 1, 1 - startOffset + i);
              const dim = date.getMonth() !== month - 1;
              const key = dayKey(date);
              const isToday = key === todayKey;
              const dayEvents = buckets.get(key) ?? [];
              const isSelected = key === selectedDay;
              const cellInner = (
                <>
                  {isToday ? (
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gold text-[13px] font-extrabold text-gold-ink">
                      {date.getDate()}
                    </span>
                  ) : (
                    <span
                      className={`text-[13px] ${
                        dim
                          ? "text-[#3e434b]"
                          : dayEvents.length > 0
                            ? "font-bold text-white"
                            : "text-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  )}
                  {dayEvents.length > 0 ? (
                    <span className="flex gap-[3px]">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={`h-[5px] w-[5px] rounded-full ${eventTypeStyle(event.eventType).dotClass}`}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="h-[5px]" />
                  )}
                </>
              );

              if (dayEvents.length > 0) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setSelectedDay(isSelected ? null : key)
                    }
                    aria-pressed={isSelected}
                    aria-label={`Show engagements on ${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
                    className={`flex flex-col items-center gap-[3px] rounded-lg py-1 transition-colors ${
                      isSelected
                        ? "bg-surface-2 ring-1 ring-gold"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    {cellInner}
                  </button>
                );
              }
              return (
                <span
                  key={i}
                  className="flex flex-col items-center gap-[3px] py-1"
                >
                  {cellInner}
                </span>
              );
            })}
          </div>
          <p className="mt-3 border-t border-edge pt-3 text-xs leading-relaxed text-faint">
            Colored marks under a date mean action. The engagements themselves
            are listed on the left.
          </p>
        </div>
      </aside>
    </div>
  );
}
