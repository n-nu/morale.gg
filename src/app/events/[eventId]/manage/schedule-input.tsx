"use client";

import { useState } from "react";

import { useIsClient } from "../../use-is-client";

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Lets a manager edit the scheduled time in their own time zone while the
 * form submits an unambiguous ISO (UTC) value through the hidden input. The
 * picker only renders on the client, where the local zone is known; the
 * hidden ISO value is always present so submits stay valid either way.
 */
export function ScheduleInput({ initialIso }: { initialIso: string }) {
  const isClient = useIsClient();
  const [iso, setIso] = useState(initialIso);

  return (
    <>
      <input type="hidden" name="scheduledAtIso" value={iso} />
      {isClient ? (
        <input
          type="datetime-local"
          id="event-scheduled-at"
          required
          value={toLocalInputValue(iso)}
          onChange={(changeEvent) => {
            const next = new Date(changeEvent.target.value);
            if (!Number.isNaN(next.getTime())) {
              setIso(next.toISOString());
            }
          }}
          className="rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground [color-scheme:dark]"
        />
      ) : (
        <input
          type="text"
          id="event-scheduled-at"
          disabled
          value={new Date(initialIso).toISOString().replace("T", " · ").slice(0, 22) + " UTC"}
          className="rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-muted"
        />
      )}
    </>
  );
}
