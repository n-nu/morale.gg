import type { Metadata } from "next";
import Link from "next/link";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import { KNOWN_MAP_NAMES } from "@/modules/events/map-art";
import { EVENT_TYPE_NAMES } from "@/modules/events/presentation";
import { canCreateEvent } from "@/modules/units/server/authorization";

import { SelectField } from "../select-field";
import { SuggestInput } from "../suggest-input";
import { TimezoneNote } from "../local-time";
import { EventScheduleFields } from "../schedule-fields";
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
    <div className="page-shell flex-1 pb-16">
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

  return (
    <div className="page-shell flex-1 pb-16">
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
          <h2 className="text-[17px] font-extrabold text-white">Event</h2>
          <TimezoneNote />
        </div>
        <form action={createEventAction} autoComplete="off" className="mt-4 flex flex-col gap-4">
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
              <SelectField
                name="eventType"
                options={EVENT_TYPE_NAMES}
                required
                ariaLabel="Event type"
              />
            </label>
            <label className={labelClass}>
              Map (optional)
              <SuggestInput name="map" options={KNOWN_MAP_NAMES} ariaLabel="Map" />
              <span className="text-[11px] font-semibold normal-case tracking-normal text-faint">
                Known maps get their own banner picture; others get a generic
                battle banner.
              </span>
            </label>
          </div>
          <section aria-labelledby="create-event-schedule">
            <h3 id="create-event-schedule" className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Schedule
            </h3>
            <EventScheduleFields initialIso="" initialDurationMinutes={null} />
          </section>
          <section aria-labelledby="create-event-sides">
            <h3 id="create-event-sides" className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Sides
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Attackers (optional)
                <input
                  name="attackerName"
                  maxLength={120}
                  aria-describedby="attacker-name-help"
                  className={inputClass}
                />
                <span id="attacker-name-help" className="text-[11px] font-medium normal-case tracking-normal text-faint">
                  Name the attacking side; this may represent multiple Units or an alliance.
                </span>
              </label>
              <label className={labelClass}>
                Defenders (optional)
                <input
                  name="defenderName"
                  maxLength={120}
                  aria-describedby="defender-name-help"
                  className={inputClass}
                />
                <span id="defender-name-help" className="text-[11px] font-medium normal-case tracking-normal text-faint">
                  Name the defending side; this may represent multiple Units or an alliance.
                </span>
              </label>
            </div>
          </section>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
              Participation
            </legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-edge-strong bg-background px-3.5 py-3 text-sm">
              <input
                type="radio"
                name="invitePolicy"
                value="OPEN"
                defaultChecked
                className="mt-1 accent-gold"
              />
              <span>
                <span className="block font-semibold text-foreground">Open Invite</span>
                <span className="block text-xs text-muted">
                  Other eligible Units may request to participate; managers review requests.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-edge-strong bg-background px-3.5 py-3 text-sm">
              <input
                type="radio"
                name="invitePolicy"
                value="CLOSED"
                className="mt-1 accent-gold"
              />
              <span>
                <span className="block font-semibold text-foreground">Closed Invite</span>
                <span className="block text-xs text-muted">
                  Units may participate only through Event management.
                </span>
              </span>
            </label>
          </fieldset>
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
