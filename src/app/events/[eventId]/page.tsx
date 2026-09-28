import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { bannerArtFor } from "@/modules/events/map-art";
import { eventTypeStyle } from "@/modules/events/presentation";
import { canManageEvent } from "@/modules/events/server/authorization";
import { getPublicEventCommandStructure, type PublicEventCommandGroup } from "@/modules/audits/server/command-groups";
import { getEventResultState } from "@/modules/events/server/results";
import {
  getEventById,
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

function PublicGroupNode({ group }: { group: PublicEventCommandGroup }) {
  return (
    <li className="border-l border-edge pl-4">
      <div className="py-2">
        <div className="font-semibold text-white">{group.name}</div>
        <div className="text-xs text-muted">{group.representedUnit.name} · Commander {group.commanderPlayerId}</div>
        {group.atomicUnits.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-body-soft">
            {group.atomicUnits.map((unit) => <li key={unit.id}>{unit.name ?? unit.persistentUnitName} · {unit.side ?? "Side not configured"} · {unit.isMandatory ? "Mandatory" : "Optional"}</li>)}
          </ul>
        ) : null}
        {group.children.length > 0 ? <ul className="mt-2 space-y-1">{group.children.map((child) => <PublicGroupNode key={child.id} group={child} />)}</ul> : null}
      </div>
    </li>
  );
}

function SideColumn({
  label,
  side,
  flagRef,
  groups,
  atomicUnits,
}: {
  label: string;
  side: "ATTACKER" | "DEFENDER";
  flagRef: string | null;
  groups: PublicEventCommandGroup[];
  atomicUnits: PublicEventCommandGroup["atomicUnits"];
}) {
  return (
    <section className="min-w-0 border-t border-edge pt-4" aria-labelledby={`${side.toLowerCase()}-heading`}>
      <div className="flex items-center gap-3">
        {flagRef ? <Image src={flagRef} alt={`${label} flag`} width={48} height={32} unoptimized className="h-8 w-12 rounded border border-edge object-cover" /> : <span aria-hidden className={`h-8 w-12 rounded border border-edge ${side === "DEFENDER" ? "bg-blue-900" : "bg-red-900"}`} />}
        <h3 id={`${side.toLowerCase()}-heading`} className="text-lg font-extrabold text-white">{label}</h3>
      </div>
      {groups.length === 0 && atomicUnits.length === 0 ? <p className="mt-4 text-sm text-muted">No {label.toLowerCase()} structure recorded.</p> : (
        <ul className="mt-3 space-y-2">{groups.map((group) => <PublicGroupNode key={group.id} group={group} />)}{atomicUnits.map((unit) => <li key={unit.id} className="border-l border-edge pl-4 text-sm text-body-soft">{unit.name ?? unit.persistentUnitName} · {unit.isMandatory ? "Mandatory" : "Optional"}</li>)}</ul>
      )}
    </section>
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

  const [approvedUnits, structure, resultState, viewerUserId] = await Promise.all([
    listApprovedEventUnits(event.id),
    getPublicEventCommandStructure(event.id),
    getEventResultState(event.id),
    getAuthenticatedUserId(),
  ]);
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

          <section className="flex flex-col gap-3" aria-labelledby="battle-structure-heading">
            <h2 id="battle-structure-heading" className="text-xl font-extrabold tracking-tight text-white">Battle structure</h2>
            <p className="text-sm text-muted">Event result: <strong className="text-white">{resultState.effective?.value ?? "Not recorded"}</strong></p>
            {structure === null || (structure.groups.length === 0 && structure.ungroupedAtomicUnits.length === 0) ? (
              <div className="rounded-[10px] border border-dashed border-[#3b3a33] bg-[#121210] px-6 py-5 text-sm text-muted">Battle sides not configured</div>
            ) : (
              <div className="grid gap-6 rounded-[10px] border border-edge bg-surface px-5 py-5 lg:grid-cols-2">
                <SideColumn label="Defenders" side="DEFENDER" flagRef={event.defenderFlagRef} groups={structure.groups.filter((group) => group.side === "DEFENDER")} atomicUnits={structure.ungroupedAtomicUnits.filter((unit) => unit.side === "DEFENDER")} />
                <SideColumn label="Attackers" side="ATTACKER" flagRef={event.attackerFlagRef} groups={structure.groups.filter((group) => group.side === "ATTACKER")} atomicUnits={structure.ungroupedAtomicUnits.filter((unit) => unit.side === "ATTACKER")} />
              </div>
            )}
          </section>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[330px] lg:flex-shrink-0">
          <div className="flex flex-col gap-3 rounded-[10px] border border-edge bg-surface px-5 py-4.5">
            <div className="text-[17px] font-extrabold text-white">
              Participating units
            </div>
            {approvedUnits.length === 0 ? (
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
            href={`/events/${event.id}/command-structure`}
            className="text-sm font-bold text-gold hover:text-gold-bright"
          >
            Command structure
          </Link>
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
