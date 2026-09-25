import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { eventTypeStyle } from "@/modules/events/presentation";
import {
  getEventManagementView,
  type EventParticipationEntry,
} from "@/modules/events/server/management";

import { LocalDateTime, TimezoneNote } from "../../local-time";
import {
  addManagerAction,
  approveParticipationAction,
  denyParticipationAction,
  revokeManagerAction,
  updateEventDetailsAction,
} from "./actions";
import { ScheduleInput } from "./schedule-input";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage event · morale.gg",
};

const inputClass =
  "rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-faint";
const labelClass =
  "flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-faint";

function SignInPanel() {
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

function Banner({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return error ? (
    <div
      role="alert"
      className="mt-5 rounded-lg border border-type-red bg-[#151111] px-4 py-3 text-sm font-semibold text-type-red"
    >
      {error}
    </div>
  ) : (
    <div
      role="status"
      className="mt-5 rounded-lg border border-type-green bg-[#0b100f] px-4 py-3 text-sm font-semibold text-green-bright"
    >
      {notice}
    </div>
  );
}

function participationStatusBadge(status: EventParticipationEntry["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-type-green bg-[#0b100f] text-green-bright";
    case "DENIED":
      return "border-type-red bg-[#151111] text-type-red";
    default:
      return "border-gold bg-[#1a1810] text-gold";
  }
}

export default async function ManageEventPage({
  params,
  searchParams,
}: PageProps<"/events/[eventId]/manage">) {
  const { eventId } = await params;
  const query = await searchParams;
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  const userId = await getAuthenticatedUserId();
  if (userId === null) {
    return <SignInPanel />;
  }

  const view = await getEventManagementView(userId, eventId);
  if (view === null) {
    notFound();
  }

  const { event, isOwner, managers, participations } = view;
  const type = eventTypeStyle(event.eventType);
  const pending = participations.filter((p) => p.status === "REQUESTED");
  const decided = participations.filter((p) => p.status !== "REQUESTED");

  const updateAction = updateEventDetailsAction.bind(null, event.id);
  const addManager = addManagerAction.bind(null, event.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link href="/events" className="text-muted hover:text-foreground">
          Events
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link
          href={`/events/${event.id}`}
          className="text-muted hover:text-foreground"
        >
          {event.name}
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">Manage</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-center gap-3.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Manage — {event.name}
        </h1>
        <span
          className={`rounded border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.06em] ${type.badgeClass}`}
        >
          {type.label}
        </span>
        <span className="rounded border border-edge-strong px-2.5 py-1 text-xs font-bold text-foreground">
          {isOwner ? "You are the owner" : "You are a manager"}
        </span>
      </header>

      <Banner notice={notice} error={error} />

      <div className="mt-7 flex flex-col gap-7 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-[10px] border border-edge bg-surface px-6 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-extrabold text-white">
                Event settings
              </h2>
              <TimezoneNote />
            </div>
            <form action={updateAction} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Event name
                  <input
                    name="name"
                    required
                    defaultValue={event.name}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Event type
                  <input
                    name="eventType"
                    required
                    defaultValue={event.eventType}
                    placeholder="Internal, External, Mixed, Grand Battle…"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass} htmlFor="event-scheduled-at">
                  Scheduled date &amp; time
                  <ScheduleInput initialIso={event.scheduledAt.toISOString()} />
                </label>
                <label className={labelClass}>
                  Opponent (optional)
                  <input
                    name="opponent"
                    defaultValue={event.opponent ?? ""}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Map (optional)
                  <input
                    name="map"
                    defaultValue={event.map ?? ""}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className={labelClass}>
                Description (optional)
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={event.description ?? ""}
                  className={`${inputClass} resize-y font-normal leading-relaxed`}
                />
              </label>
              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright"
                >
                  Save event details
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-[10px] border border-edge bg-surface">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
              <h2 className="text-[17px] font-extrabold text-white">
                Participation requests
              </h2>
              <span className="text-[13px] text-faint">
                Approving or denying a request is permanent.
              </span>
            </div>

            {participations.length === 0 ? (
              <p className="border-t border-edge px-6 py-8 text-sm text-muted">
                No units have requested to participate yet. Requests submitted
                by unit managers will appear here.
              </p>
            ) : (
              <>
                {pending.length > 0 ? (
                  <ul className="border-t border-edge">
                    {pending.map((participation) => (
                      <li
                        key={participation.id}
                        className="flex flex-wrap items-center gap-3 border-b border-edge px-6 py-3.5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/units/${participation.unitId}`}
                            className="font-semibold text-foreground hover:text-white"
                          >
                            {participation.unitName}
                          </Link>
                          <div className="text-xs text-faint">
                            {participation.unitCommanderName ? (
                              <>Commander: {participation.unitCommanderName} · </>
                            ) : null}
                            Requested{" "}
                            <LocalDateTime
                              iso={participation.createdAt.toISOString()}
                            />
                          </div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${participationStatusBadge(participation.status)}`}
                        >
                          Pending
                        </span>
                        <form
                          action={approveParticipationAction.bind(
                            null,
                            event.id,
                            participation.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-type-green px-4 py-2 text-[13px] font-bold text-green-bright transition-colors hover:bg-green-bright hover:text-[#0b100f]"
                          >
                            Approve
                          </button>
                        </form>
                        <form
                          action={denyParticipationAction.bind(
                            null,
                            event.id,
                            participation.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-type-red px-4 py-2 text-[13px] font-bold text-type-red transition-colors hover:bg-type-red hover:text-white"
                          >
                            Deny
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-edge px-6 py-4 text-sm text-muted">
                    No pending requests right now.
                  </p>
                )}

                {decided.length > 0 ? (
                  <div className="border-t border-edge bg-background/40 px-6 py-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                      Decided
                    </h3>
                    <ul className="mt-2 flex flex-col gap-2">
                      {decided.map((participation) => (
                        <li
                          key={participation.id}
                          className="flex flex-wrap items-center gap-3 text-sm"
                        >
                          <Link
                            href={`/units/${participation.unitId}`}
                            className="font-semibold text-foreground hover:text-white"
                          >
                            {participation.unitName}
                          </Link>
                          <span
                            className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${participationStatusBadge(participation.status)}`}
                          >
                            {participation.status === "APPROVED"
                              ? "Approved"
                              : "Denied"}
                          </span>
                          <span className="text-xs text-faint">
                            <LocalDateTime
                              iso={participation.updatedAt.toISOString()}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[330px] lg:flex-shrink-0">
          <section className="flex flex-col gap-3 rounded-[10px] border border-edge bg-surface px-5 py-4.5">
            <h2 className="text-[17px] font-extrabold text-white">
              Event managers
            </h2>
            <p className="text-[13px] leading-relaxed text-muted">
              Managers can edit this event and decide participation requests.
              Only the owner can add or remove managers.
            </p>
            {managers.length === 0 ? (
              <p className="text-sm text-faint">No managers added yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {managers.map((manager) => (
                  <li
                    key={manager.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">
                        {manager.name ?? manager.email ?? manager.userId}
                      </div>
                      {manager.name && manager.email ? (
                        <div className="truncate text-xs text-faint">
                          {manager.email}
                        </div>
                      ) : null}
                    </div>
                    {isOwner ? (
                      <form
                        action={revokeManagerAction.bind(
                          null,
                          event.id,
                          manager.userId,
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-lg border border-edge-strong px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-type-red hover:text-type-red"
                        >
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {isOwner ? (
              <form action={addManager} className="mt-1 flex flex-col gap-2">
                <label className={labelClass}>
                  Add manager by email
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="their-google-account@email.com"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  className="self-start rounded-lg border border-gold px-4 py-2 text-[13px] font-bold text-gold transition-colors hover:bg-gold hover:text-gold-ink"
                >
                  Add manager
                </button>
              </form>
            ) : null}
          </section>

          <Link
            href={`/events/${event.id}`}
            className="text-sm font-bold text-gold hover:text-gold-bright"
          >
            ← View public event page
          </Link>
          <Link
            href="/events/manage"
            className="text-sm font-bold text-gold hover:text-gold-bright"
          >
            ← All events you manage
          </Link>
        </aside>
      </div>
    </div>
  );
}
