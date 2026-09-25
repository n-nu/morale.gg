import type { Metadata } from "next";
import Link from "next/link";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { KNOWN_MAP_NAMES } from "@/modules/events/map-art";
import { canCreateEvent } from "@/modules/units/server/authorization";

import { TimezoneNote } from "../local-time";
import { ScheduleInput } from "../[eventId]/manage/schedule-input";
import { createEventAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create event · morale.gg",
};

const inputClass =
  "rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-faint";
const labelClass =
  "flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-faint";

function GatePanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <div className="mt-16 rounded-[10px] border border-edge bg-surface px-6 py-12 text-center">
        <p className="font-bold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

export default async function CreateEventPage({
  searchParams,
}: PageProps<"/events/create">) {
  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  const userId = await getAuthenticatedUserId();
  if (userId === null) {
    return (
      <GatePanel
        title="Sign in to create events."
        body="Event creation is available to users holding event-management authority."
      />
    );
  }

  const allowed = await canCreateEvent(userId);
  if (!allowed) {
    return (
      <GatePanel
        title="You don't have event-creation permission."
        body="Creating events requires MANAGE_EVENTS authority granted through your unit. Ask your commander or the community leadership to grant it."
      />
    );
  }

  const defaultScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <span>Community</span>
        <span className="mx-2 text-[#3e434b]">/</span>
        <Link href="/events" className="text-muted hover:text-foreground">
          Events
        </Link>
        <span className="mx-2 text-[#3e434b]">/</span>
        <span className="text-foreground">Create</span>
      </nav>

      <header className="mt-5 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
          Event management
        </p>
        <h1 className="text-[34px] font-extrabold leading-none tracking-tight text-white">
          Create event
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          You become the event&apos;s owner: you can edit it, add managers, and
          decide participation requests. Events cannot be scheduled in the
          past.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-5 max-w-3xl rounded-lg border border-type-red bg-[#151111] px-4 py-3 text-sm font-semibold text-type-red"
        >
          {error}
        </div>
      ) : null}

      <section className="mt-6 max-w-3xl rounded-[10px] border border-edge bg-surface px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-extrabold text-white">
            Event details
          </h2>
          <TimezoneNote />
        </div>
        <form action={createEventAction} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Event name
              <input
                name="name"
                required
                placeholder="Battle of the Rhine Crossing"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Event type
              <input
                name="eventType"
                required
                placeholder="Internal, External, Mixed, Grand Battle…"
                className={inputClass}
              />
            </label>
            <label className={labelClass} htmlFor="event-scheduled-at">
              Scheduled date &amp; time
              <ScheduleInput initialIso={defaultScheduledAt.toISOString()} />
            </label>
            <label className={labelClass}>
              Opponent (optional)
              <input name="opponent" className={inputClass} />
            </label>
            <label className={labelClass}>
              Map (optional)
              <input name="map" list="map-suggestions" className={inputClass} />
              <span className="text-[11px] font-semibold normal-case tracking-normal text-faint">
                Known maps get their own banner picture; others get a generic
                battle banner.
              </span>
            </label>
            <datalist id="map-suggestions">
              {KNOWN_MAP_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <label className={labelClass}>
            Description (optional)
            <textarea
              name="description"
              rows={4}
              className={`${inputClass} resize-y font-normal leading-relaxed`}
            />
          </label>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright"
            >
              Create event
            </button>
            <Link
              href="/events/manage"
              className="text-sm font-bold text-muted transition-colors hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
