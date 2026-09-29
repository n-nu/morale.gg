"use client";

import type { EventCommandGroup } from "@prisma/client";
import { useState } from "react";

type MoveAction = (data: FormData) => Promise<void>;

export function MoveMenu({
  eventId,
  nodeType,
  nodeId,
  groups,
  excludedGroupIds = [],
  moveAction,
}: {
  eventId: string;
  nodeType: "group" | "atomic";
  nodeId: string;
  groups: Pick<EventCommandGroup, "id" | "name">[];
  excludedGroupIds?: string[];
  moveAction: MoveAction;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Move to...</summary>
      {open ? (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            await moveAction(formData);
          }}
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="nodeType" value={nodeType} />
          <input type="hidden" name="nodeId" value={nodeId} />
          <label className="text-xs font-semibold text-muted">
            Destination
            <select name="destination" defaultValue="side:UNSORTED" className="mt-1 w-full rounded border border-edge bg-background px-2 py-1.5 text-sm text-foreground">
              <option value="side:UNSORTED">Unsorted</option>
              <option value="side:DEFENDER">Defender root</option>
              <option value="side:ATTACKER">Attacker root</option>
              {groups.filter((group) => !excludedGroupIds.includes(group.id)).map((group) => (
                <option key={group.id} value={`group:${group.id}`}>{group.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="self-start text-xs font-semibold text-gold hover:text-gold-bright">Move</button>
        </form>
      ) : null}
    </details>
  );
}