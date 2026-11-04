import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { bannerArtFor } from "@/modules/events/map-art";
import {
  deriveEventSchedule,
  eventTypeStyle,
  isBattleEventType,
} from "@/modules/events/presentation";
import { canManageEvent } from "@/modules/events/server/authorization";
import { getEventResultState } from "@/modules/events/server/results";
import { getEventBattleStatistics } from "@/modules/statistics/event-battle";
import {
  getEventById,
  listApprovedEventUnits,
} from "@/modules/events/server/queries";

import { LocalDateTime, TimezoneNote } from "../local-time";
import { PublicBattleStructure, PublicEventStatistics } from "./battle-structure";

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

  const isBattleEvent = isBattleEventType(event.eventType);
  const [approvedUnits, battleStatistics, resultState, viewerUserId] = await Promise.all([
    listApprovedEventUnits(event.id),
    isBattleEvent
      ? getEventBattleStatistics(event.id)
      : Promise.resolve(null),
    isBattleEvent
      ? getEventResultState(event.id)
      : Promise.resolve(null),
    getAuthenticatedUserId(),
  ]);
  const unitImageRefs = Object.fromEntries(
    approvedUnits.map(({ unitId, imageRef }) => [unitId, imageRef]),
  );
  const viewerCanManage =
    viewerUserId !== null && (await canManageEvent(viewerUserId, event.id));

  const type = eventTypeStyle(event.eventType);
  const art = bannerArtFor(event.map, event.name);
  const { rallyAt, expectedEndAt } = deriveEventSchedule(
    event.scheduledAt,
    event.rallyMinutesBeforeStart,
    event.durationMinutes,
  );

  return (
    <div className="page-shell flex-1 pb-16">
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
          sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1791px) calc(100vw - 64px), 1696px"
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
            <section
              aria-label="Event schedule"
              className="flex flex-col gap-4 rounded-[10px] border border-edge bg-surface px-4 py-3.5 sm:col-span-2 lg:col-span-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                    Event schedule
                  </h2>
                  <div className="mt-1">
                    <TimezoneNote />
                  </div>
                </div>
                <div className="flex min-w-36 flex-col gap-1 border-t border-edge pt-3 sm:min-w-40 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                    Planned duration
                  </div>
                  <div className="text-base font-bold text-white">
                    {event.durationMinutes === null
                      ? "Not set"
                      : `${event.durationMinutes} minutes`}
                  </div>
                  <div className="text-xs text-muted">Expected event length</div>
                </div>
              </div>
              <ol className="grid gap-3 sm:grid-cols-3">
                <li className="min-w-0 border-l-2 border-gold pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                    Rally
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {event.rallyMinutesBeforeStart === 0
                      ? "At event start"
                      : `${event.rallyMinutesBeforeStart} minutes before start`}
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">
                    <LocalDateTime iso={rallyAt.toISOString()} mode="full" />
                  </div>
                </li>
                <li className="min-w-0 border-l-2 border-edge-strong pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                    Event starts
                  </div>
                  <div className="mt-0.5 text-xs text-muted">Scheduled start</div>
                  <div className="mt-1 text-sm font-bold text-white">
                    <LocalDateTime iso={event.scheduledAt.toISOString()} mode="full" />
                  </div>
                </li>
                <li className="min-w-0 border-l-2 border-edge-strong pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                    Expected end
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {expectedEndAt ? "Planned finish" : "Duration not set"}
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {expectedEndAt ? (
                      <LocalDateTime iso={expectedEndAt.toISOString()} mode="full" />
                    ) : (
                      "Not set"
                    )}
                  </div>
                </li>
              </ol>
            </section>
            {event.attackerName ? (
              <MetaCard label="Attackers">{event.attackerName}</MetaCard>
            ) : null}
            {event.defenderName ? (
              <MetaCard label="Defenders">{event.defenderName}</MetaCard>
            ) : null}
            <MetaCard
              label="Participation"
              sub={
                event.invitePolicy === "OPEN"
                  ? "Eligible Units may request participation."
                  : "Invitation required; new requests are blocked."
              }
            >
              {event.invitePolicy === "OPEN" ? "Open Invite" : "Closed Invite"}
            </MetaCard>
            {event.map ? <MetaCard label="Map">{event.map}</MetaCard> : null}
          </div>

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

          {isBattleEvent ? (
            <>
              <PublicEventStatistics
                sideSummaries={battleStatistics?.sideSummaries ?? { ATTACKER: null, DEFENDER: null }}
                groups={battleStatistics?.groups ?? []}
                ungroupedAtomicUnits={battleStatistics?.ungroupedAtomicUnits ?? []}
              />
              <PublicBattleStructure
                result={resultState?.effective?.value ?? null}
                defenderFlagRef={event.defenderFlagRef}
                attackerFlagRef={event.attackerFlagRef}
                groups={battleStatistics?.groups ?? []}
                ungroupedAtomicUnits={battleStatistics?.ungroupedAtomicUnits ?? []}
                unitImageRefs={unitImageRefs}
              />
            </>
          ) : null}
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[330px] lg:flex-shrink-0">
          <div className="flex flex-col gap-3 rounded-[10px] border border-edge bg-surface px-5 py-4.5">
            <div className="text-[17px] font-extrabold text-white">
              Participating units
            </div>
            {approvedUnits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#3e434b] bg-background px-4 py-4 text-[13px] leading-relaxed text-muted">
                {event.invitePolicy === "OPEN"
                  ? "No units are confirmed yet. Eligible Unit managers may request participation for Event manager review."
                  : "No units are confirmed yet. Invitation is required; new participation requests are blocked."}
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
              {event.invitePolicy === "OPEN"
                ? "Participation requests are reviewed by the Event organizers."
                : "Only Event management may add participating Units."}
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
