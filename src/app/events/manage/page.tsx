import type { Metadata } from "next";
import Link from "next/link";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { eventTypeStyle } from "@/modules/events/presentation";
import { listManageableEvents } from "@/modules/events/server/management";

import { LocalDateTime, TimezoneNote } from "../local-time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage events · morale.gg",
};

export default async function ManageEventsPage() {
  const userId = await getAuthenticatedUserId();

  if (userId === null) {
    return (
      <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
        <div className="mt-16 rounded-[10px] border border-edge bg-surface px-6 py-12 text-center">
          <p className="font-bold text-white">Sign in to manage events.</p>
          <p className="mt-2 text-sm text-muted">
            Event management is available to an event&apos;s owner and its
            managers.
          </p>
        </div>
      </div>
    );
  }

  const manageable = await listManageableEvents(userId);

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link href="/events" className="text-muted hover:text-foreground">
          Events
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">Manage</span>
      </nav>

      <header className="mt-5 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
          Event management
        </p>
        <div className="flex items-baseline gap-3">
          <h1 className="text-[44px] font-extrabold leading-none tracking-tight text-white">
            Your events
          </h1>
          {manageable.length > 0 ? (
            <span className="rounded-[7px] border border-edge-strong bg-surface-2 px-3 py-0.5 text-base font-bold text-foreground">
              {manageable.length}
            </span>
          ) : null}
        </div>
        <TimezoneNote />
      </header>

      {manageable.length === 0 ? (
        <div className="mt-10 rounded-[10px] border border-edge bg-surface px-6 py-12 text-center">
          <p className="font-bold text-white">
            You don&apos;t manage any events yet.
          </p>
          <p className="mt-2 text-sm text-muted">
            Events you create, or are added to as a manager, appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {manageable.map(({ event, isOwner, pendingRequestCount }) => {
            const type = eventTypeStyle(event.eventType);
            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}/manage`}
                  className={`flex flex-wrap items-center gap-3.5 rounded-[10px] border border-edge border-l-[3px] bg-surface px-5 py-4 transition-colors hover:border-edge-strong ${type.barClass}`}
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <div className="truncate text-lg font-extrabold tracking-tight text-white">
                      {event.name}
                    </div>
                    <div className="text-[13px] text-muted">
                      <LocalDateTime iso={event.scheduledAt.toISOString()} />
                    </div>
                  </div>
                  <span
                    className={`rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${type.badgeClass}`}
                  >
                    {type.label}
                  </span>
                  <span className="rounded border border-edge-strong px-2 py-1 text-[11px] font-bold text-muted">
                    {isOwner ? "Owner" : "Manager"}
                  </span>
                  {pendingRequestCount > 0 ? (
                    <span className="rounded border border-gold bg-[#1a1810] px-2 py-1 text-[11px] font-bold text-gold">
                      {pendingRequestCount} pending{" "}
                      {pendingRequestCount === 1 ? "request" : "requests"}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
