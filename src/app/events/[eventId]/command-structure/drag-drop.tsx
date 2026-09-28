"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ServerAction = (data: FormData) => Promise<void>;

type DraggedNode = {
  type: "group" | "atomic";
  id: string;
};

function readDraggedNode(event: React.DragEvent): DraggedNode | null {
  const raw = event.dataTransfer.getData("application/x-morale-battle-node");
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DraggedNode;
    return value.type === "group" || value.type === "atomic" ? value : null;
  } catch {
    return null;
  }
}

export function DraggableNode({
  type,
  id,
  children,
}: {
  type: DraggedNode["type"];
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-morale-battle-node", JSON.stringify({ type, id }));
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export function DropTarget({
  eventId,
  groupId,
  reparentAction,
  attachAtomicAction,
  children,
}: {
  eventId: string;
  groupId: string;
  reparentAction: ServerAction;
  attachAtomicAction: ServerAction;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        if (readDraggedNode(event)) {
          event.preventDefault();
          setActive(true);
        }
      }}
      onDragLeave={() => setActive(false)}
      onDrop={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(false);
        const node = readDraggedNode(event);
        if (!node) return;
        const data = new FormData();
        data.set("eventId", eventId);
        if (node.type === "group") {
          data.set("groupId", node.id);
          data.set("parentGroupId", groupId);
          await reparentAction(data);
        } else {
          data.set("groupId", groupId);
          data.set("atomicEventUnitId", node.id);
          await attachAtomicAction(data);
        }
      }}
      className={active ? "rounded border border-gold bg-gold/10" : "rounded"}
    >
      {children}
    </div>
  );
}
