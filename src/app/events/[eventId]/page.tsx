import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { bannerArtFor } from "@/modules/events/map-art";
import { eventTypeStyle } from "@/modules/events/presentation";
import { canManageEvent } from "@/modules/events/server/authorization";
import {
  getEventById,
  listApprovedEventTeams,
  listApprovedEventUnits,
} from "@/modules/events/server/queries";

import { LocalDateTime, TimezoneNote } from "../local-time";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/events/[eventId]">): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  return {
    title: event ? `${event.name} · morale.gg` : "Event · morale.gg",
  };
}

const STAT_TILES = ["Kills", "Deaths", "Assists", "Tickets", "Flag captures", "Stars"];

/**
 * Placeholder side flags for the versus layout. Follow-up: reuse the Units
 * directory's nation flag art once exposed (logged in TKT-20260925-000019).
 */
function SideFlag({ side }: { side: string }) {
  const normalized = side.toLowerCase();
  if (normalized.includes("france") || normalized.includes("french")) {
    return (
      <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden className="flex-shrink-0 rounded">
        <rect width="34" height="24" rx="3" fill="#e8e6e0" />
        <path d="M3 0h8.33v24H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" fill="#2e4c8f" />
        <path d="M22.67 0H31a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3h-8.33z" fill="#b03a3a" />
      </svg>
    );
  }
  if (normalized.includes("pruss")) {
    return (
      <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden className="flex-shrink-0 rounded">
        <rect width="34" height="24" rx="3" fill="#e8e6e0" />
        <path d="M3 0h28a3 3 0 0 1 3 3v5H0V3a3 3 0 0 1 3-3z" fill="#141210" />
        <path d="M0 16h34v5a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill="#141210" />
        <path d="M17 9.2l1.1 2.1 2.3.3-1.7 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="#141210" />
      </svg>
    );
  }
  return null;
}

function TeamPanel({
  team,
  units,
  align,
}: {
  team: string;
  units: { unitId: string; unitName: string }[];
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex-1 border border-edge bg-surface px-5 py-4 ${
        align === "left" ? "rounded-l-xl" : "rounded-r-xl"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SideFlag side={team} />
          <span className="text-[17px] font-extrabold text-white">{team}</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
          {units.length} {units.length === 1 ? "unit" : "units"}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {units.map((unit) => (
          <li key={unit.unitId} className="flex items-center gap-2.5 text-sm">
            <svg width="13" height="15" viewBox="0 0 26 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-faint">
              <path d="M13 2 L24 6 V15 C24 21.5 19.5 26.5 13 28.5 C6.5 26.5 2 21.5 2 15 V6 Z" />
            </svg>
            <Link
              href={`/units/${unit.unitId}`}
              className="font-semibold text-foreground hover:text-white"
            >
              {unit.unitName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaCard({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-edge bg-surface px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
        {label}
      </div>
      <div className="text-base font-bold text-white">{children}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const [approvedUnits, teams, viewerUserId] = await Promise.all([
    listApprovedEventUnits(event.id),
    listApprovedEventTeams(event.id),
    getAuthenticatedUserId(),
  ]);
  const versus = teams.length === 2 ? teams : null;
  const viewerCanManage =
    viewerUserId !== null && (await canManageEvent(viewerUserId, event.id));

  const type = eventTypeStyle(event.eventType);
  const art = bannerArtFor(event.map, event.name);

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="py-4 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link href="/events" className="text-muted hover:text-foreground">
          Events
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">{event.name}</span>
      </nav>

      <div className="relative h-[220px] overflow-hidden rounded-[10px] border border-edge">
        <Image
          src={art.src}
          alt={art.alt}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[rgba(8,9,11,0.35)]" />
        {event.map ? (
          <span className="absolute right-5 top-3.5 flex items-center gap-1.5 rounded-[5px] bg-[rgba(10,10,12,0.72)] px-2.5 py-1.5 text-xs font-semibold text-[#d8d6ce]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.2" />
            </svg>
            Map: {event.map}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-3.5 bg-[rgba(10,10,12,0.78)] px-6 py-4">
          <span
            className={`rounded border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.06em] ${type.badgeClass}`}
          >
            {type.label}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {event.name}
          </h1>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-7 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <MetaCard label="Date & time" sub={<TimezoneNote />}>
              <LocalDateTime iso={event.scheduledAt.toISOString()} mode="full" />
            </MetaCard>
            {event.opponent ? (
              <MetaCard label="Opponent">{event.opponent}</MetaCard>
            ) : null}
            {event.map ? <MetaCard label="Map">{event.map}</MetaCard> : null}
          </div>

          {versus ? (
            <section className="flex flex-col gap-3" aria-label="Sides">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Sides
              </h2>
              <div className="flex items-stretch">
                <TeamPanel team={versus[0].team} units={versus[0].units} align="left" />
                <div className="flex w-[72px] flex-shrink-0 items-center justify-center border-y border-edge bg-surface-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold bg-[#1a1810] text-[14px] font-extrabold text-gold">
                    VS
                  </span>
                </div>
                <TeamPanel team={versus[1].team} units={versus[1].units} align="right" />
              </div>
            </section>
          ) : null}

          {event.description ? (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                About this event
              </h2>
              <p className="max-w-3xl whitespace-pre-line text-[15px] leading-[1.65] text-body-soft">
                {event.description}
              </p>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Battle statistics
            </h2>
            <div className="flex flex-col gap-4 rounded-[10px] border-2 border-dashed border-[#3b3a33] bg-[#121210] px-6 py-5">
              <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6d7781" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[15px] font-bold text-muted">
                    Statistics unlock after the battle
                  </div>
                  <div className="text-[13px] text-faint">
                    Once each participating unit submits its audit and it is
                    locked, the recorded results appear here.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {STAT_TILES.map((label) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 rounded-lg border border-edge bg-surface px-3 py-2.5"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
                      {label}
                    </span>
                    <span className="text-xl font-bold text-faint">—</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[330px] lg:flex-shrink-0">
          <div className="flex flex-col gap-3 rounded-[10px] border border-edge bg-surface px-5 py-4.5">
            <div className="text-[17px] font-extrabold text-white">
              Participating units
            </div>
            {versus ? (
              <p className="text-[13px] leading-relaxed text-muted">
                {approvedUnits.length} units confirmed across two sides — see
                the Sides section for who fights whom.
              </p>
            ) : approvedUnits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#3e434b] bg-background px-4 py-4 text-[13px] leading-relaxed text-muted">
                No units are confirmed yet. Unit managers can request
                participation, and the event organizers approve each request.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {approvedUnits.map((unit) => (
                  <li key={unit.unitId} className="flex items-center gap-2.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="text-green-bright">
                      <path d="M4 12l5 5 10-11" />
                    </svg>
                    <Link
                      href={`/units/${unit.unitId}`}
                      className="text-sm font-semibold text-foreground hover:text-white"
                    >
                      {unit.unitName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs leading-relaxed text-faint">
              Participation requests are reviewed by the event organizers.
            </p>
          </div>
          {viewerCanManage ? (
            <Link
              href={`/events/${event.id}/manage`}
              className="rounded-lg bg-gold px-5 py-2.5 text-center text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright"
            >
              Manage event
            </Link>
          ) : null}
          <Link
            href="/events"
            className="text-sm font-bold text-gold hover:text-gold-bright"
          >
            ← All events
          </Link>
        </aside>
      </div>
    </div>
  );
}
