import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { bannerArtFor } from "@/modules/events/map-art";
import { eventTypeStyle, isPastEvent } from "@/modules/events/presentation";
import { listEvents, type Event } from "@/modules/events/server/queries";

import { LocalDateTime, TimezoneNote } from "./local-time";
import { ViewToggle } from "./view-toggle";

export const metadata: Metadata = {
  title: "Events · morale.gg",
  description: "Upcoming and past events across the community.",
};

export const dynamic = "force-dynamic";

const TYPE_FILTERS = [
  { key: "internal", label: "Internal" },
  { key: "external", label: "External" },
  { key: "mixed", label: "Mixed" },
  { key: "grand", label: "Grand Battle" },
];

function MapPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function EventCard({ event }: { event: Event }) {
  const type = eventTypeStyle(event.eventType);
  const art = bannerArtFor(event.map, event.name);
  return (
    <Link
      href={`/events/${event.id}`}
      className={`block overflow-hidden rounded-[10px] border border-edge border-l-[3px] bg-surface transition-colors hover:border-edge-strong ${type.barClass}`}
    >
      <div className="relative h-[140px] overflow-hidden">
        <Image
          src={art.src}
          alt={art.alt}
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[rgba(8,9,11,0.35)]" />
        {event.map ? (
          <span className="absolute right-4 top-3 flex items-center gap-1.5 rounded-[5px] bg-[rgba(10,10,12,0.72)] px-2.5 py-1.5 text-xs font-semibold text-[#d8d6ce]">
            <MapPin />
            {event.map}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-[rgba(10,10,12,0.76)] px-4 py-2.5">
          <span
            className={`rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${type.badgeClass}`}
          >
            {type.label}
          </span>
          <span className="truncate text-[21px] font-extrabold tracking-tight text-white">
            {event.name}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-5 py-4">
        {event.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">
            {event.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
            <LocalDateTime iso={event.scheduledAt.toISOString()} />
          </span>
          {event.opponent ? (
            <span className="inline-flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 4l10 10M20 4L10 14" />
                <path d="M14 14l3 3M10 14l-3 3" />
              </svg>
              vs {event.opponent}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default async function EventsPage({
  searchParams,
}: PageProps<"/events">) {
  const params = await searchParams;
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const activeType = TYPE_FILTERS.some((f) => f.key === rawType)
    ? (rawType as string)
    : null;

  const allEvents = await listEvents();
  const events = activeType
    ? allEvents.filter((e) => eventTypeStyle(e.eventType).key === activeType)
    : allEvents;
  const now = new Date();
  const upcoming = events.filter((e) => !isPastEvent(e.scheduledAt, now));
  const past = events.filter((e) => isPastEvent(e.scheduledAt, now)).reverse();

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">Events</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
            Schedule
          </p>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[44px] font-extrabold leading-none tracking-tight text-white">
              Events
            </h1>
            {allEvents.length > 0 ? (
              <span className="rounded-[7px] border border-edge-strong bg-surface-2 px-3 py-0.5 text-base font-bold text-foreground">
                {allEvents.length}
              </span>
            ) : null}
          </div>
          <TimezoneNote />
        </div>
        <ViewToggle active="list" />
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          href="/events"
          className={
            activeType === null
              ? "rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-gold-ink"
              : "rounded-full border border-edge-strong bg-surface px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-faint"
          }
        >
          All types
        </Link>
        {TYPE_FILTERS.map((f) => {
          const style = eventTypeStyle(f.label);
          const active = activeType === f.key;
          return (
            <Link
              key={f.key}
              href={`/events?type=${f.key}`}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-gold-ink"
                  : "inline-flex items-center gap-2 rounded-full border border-edge-strong bg-surface px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-faint"
              }
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${active ? "bg-gold-ink/60" : style.dotClass}`}
              />
              {f.label}
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <div className="mt-10 rounded-[10px] border border-edge bg-surface px-6 py-12 text-center">
          <p className="font-bold text-white">
            {allEvents.length === 0
              ? "No events are scheduled yet."
              : "No events match this filter."}
          </p>
          <p className="mt-2 text-sm text-muted">
            {allEvents.length === 0
              ? "When events are added, they will appear here for everyone — no sign-in needed."
              : "Try a different event type, or view all types."}
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {upcoming.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-extrabold text-white">Upcoming</h2>
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          ) : null}
          {past.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-extrabold text-white">Past</h2>
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
