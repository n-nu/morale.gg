"use client";

import { useState } from "react";

import { deriveEventSchedule } from "@/modules/events/schedule";

import { LocalDateTime } from "./local-time";
import { ScheduleInput } from "./[eventId]/manage/schedule-input";

const labelClass =
  "flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-faint";
const inputClass =
  "rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-faint";

export function EventScheduleFields({
  initialIso,
  initialRallyMinutes = 0,
  initialDurationMinutes,
}: {
  initialIso: string;
  initialRallyMinutes?: number;
  initialDurationMinutes: number | null;
}) {
  const [scheduledAtIso, setScheduledAtIso] = useState(initialIso);
  const [rallyMinutes, setRallyMinutes] = useState(String(initialRallyMinutes));
  const [durationMinutes, setDurationMinutes] = useState(
    initialDurationMinutes === null ? "" : String(initialDurationMinutes),
  );
  const start = scheduledAtIso ? new Date(scheduledAtIso) : null;
  const rallyValue = Number(rallyMinutes);
  const durationValue = Number(durationMinutes);
  const preview =
    start !== null &&
    Number.isFinite(start.getTime()) &&
    Number.isInteger(rallyValue) &&
    rallyValue >= 0
      ? deriveEventSchedule(
          start,
          rallyValue,
          Number.isInteger(durationValue) && durationValue > 0
            ? durationValue
            : null,
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass} htmlFor="event-scheduled-at">
          Scheduled start
          <ScheduleInput
            initialIso={initialIso}
            onIsoChange={setScheduledAtIso}
          />
        </label>
        <label className={labelClass} htmlFor="event-rally-minutes">
          Rally time
          <span className="text-[11px] font-medium normal-case tracking-normal text-muted">
            Minutes before the scheduled start
          </span>
          <input
            id="event-rally-minutes"
            name="rallyMinutesBeforeStart"
            type="number"
            min={0}
            max={1440}
            step={1}
            required
            value={rallyMinutes}
            onChange={(event) => setRallyMinutes(event.target.value)}
            aria-describedby="event-rally-help"
            className={inputClass}
          />
          <span id="event-rally-help" className="text-[11px] font-medium normal-case tracking-normal text-faint">
            Enter 0 to rally at the Event start.
          </span>
        </label>
        <label className={labelClass} htmlFor="event-duration-minutes">
          Event duration
          <span className="text-[11px] font-medium normal-case tracking-normal text-muted">
            Expected length in minutes
          </span>
          <input
            id="event-duration-minutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={1440}
            step={1}
            required
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            aria-describedby="event-duration-help"
            className={inputClass}
          />
          <span id="event-duration-help" className="text-[11px] font-medium normal-case tracking-normal text-faint">
            Use a whole number from 1 to 1440 minutes.
          </span>
        </label>
      </div>
      <section
        aria-label="Schedule preview"
        aria-live="polite"
        className="grid gap-3 rounded-lg border border-edge bg-background px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="min-w-0">
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
            Schedule preview
          </h4>
          {preview ? (
            <ol className="grid gap-3 sm:grid-cols-3">
              <li className="min-w-0 border-l-2 border-gold pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
                  Rally
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {rallyValue === 0
                    ? "At event start"
                    : `${rallyValue} minutes before start`}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  <LocalDateTime iso={preview.rallyAt.toISOString()} mode="full" />
                </div>
              </li>
              <li className="min-w-0 border-l-2 border-edge-strong pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
                  Event starts
                </div>
                <div className="mt-0.5 text-xs text-muted">Scheduled start</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  <LocalDateTime iso={scheduledAtIso} mode="full" />
                </div>
              </li>
              <li className="min-w-0 border-l-2 border-edge-strong pl-3 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
                  Expected end
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {preview.expectedEndAt ? "Planned finish" : "Duration not set"}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {preview.expectedEndAt ? (
                    <LocalDateTime
                      iso={preview.expectedEndAt.toISOString()}
                      mode="full"
                    />
                  ) : (
                    "Not set"
                  )}
                </div>
              </li>
            </ol>
          ) : (
            <p className="text-xs text-muted">
              Choose a scheduled start to preview the rally, event start, and
              expected end.
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-1 border-t border-edge pt-3 sm:min-w-36 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">
            Planned duration
          </div>
          <div className="text-base font-bold text-foreground">
            {Number.isInteger(durationValue) && durationValue > 0
              ? `${durationValue} minutes`
              : "Not set"}
          </div>
          <div className="text-xs text-muted">Expected event length</div>
        </div>
      </section>
    </div>
  );
}
