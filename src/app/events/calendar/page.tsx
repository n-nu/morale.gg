import type { Metadata } from "next";
import Link from "next/link";

import { eventTypeStyle } from "@/modules/events/presentation";
import { listEvents } from "@/modules/events/server/queries";

import { TimezoneNote } from "../local-time";
import { ViewToggle } from "../view-toggle";
import { CalendarGrid } from "./calendar-grid";

export const metadata: Metadata = {
  title: "Event calendar · morale.gg",
  description: "Community events on a monthly calendar.",
};

export const dynamic = "force-dynamic";

const LEGEND = ["Internal", "External", "Mixed", "Grand Battle"];

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(raw: string | undefined): { year: number; month: number } {
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default async function EventCalendarPage({
  searchParams,
}: PageProps<"/events/calendar">) {
  const params = await searchParams;
  const rawMonth = Array.isArray(params.m) ? params.m[0] : params.m;
  const { year, month } = parseMonthKey(rawMonth);

  const prev = monthKeyOf(new Date(year, month - 2, 1));
  const next = monthKeyOf(new Date(year, month, 1));
  const title = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const events = await listEvents();
  const calendarEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    iso: event.scheduledAt.toISOString(),
    eventType: event.eventType,
  }));

  const navButton =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-edge-strong bg-surface text-muted transition-colors hover:text-white";

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link href="/events" className="text-muted hover:text-foreground">
          Events
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">Calendar</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/events/calendar?m=${prev}`} aria-label="Previous month" className={navButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <h1 className="text-[28px] font-extrabold tracking-tight text-white">
            {title}
          </h1>
          <Link href={`/events/calendar?m=${next}`} aria-label="Next month" className={navButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
          <ViewToggle active="calendar" />
        </div>
        <div className="flex items-center gap-4 text-[13px] text-muted">
          {LEGEND.map((label) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-[9px] w-[9px] rounded-full ${eventTypeStyle(label).dotClass}`}
              />
              {label}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-2 pb-4">
        <TimezoneNote />
      </div>

      <CalendarGrid year={year} month={month} events={calendarEvents} />
    </div>
  );
}
