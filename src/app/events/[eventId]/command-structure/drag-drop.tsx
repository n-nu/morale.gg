"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ServerAction = (data: FormData) => Promise<void>;

type DraggedNode = {
  type: "group" | "atomic";
  id: string;
  descendantIds?: string[];
};

let activeDraggedNode: DraggedNode | null = null;

function readDraggedNode(event: React.DragEvent): DraggedNode | null {
  if (activeDraggedNode !== null) return activeDraggedNode;
  const raw = event.dataTransfer.getData("application/x-morale-battle-node");
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DraggedNode;
    return value.type === "group" || value.type === "atomic" ? value : null;
  } catch {
    return null;
  }
}

export function DragHandle({
  type,
  id,
  descendantIds = [],
  label,
}: {
  type: DraggedNode["type"];
  id: string;
  descendantIds?: string[];
  label: string;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        activeDraggedNode = { type, id, descendantIds };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-morale-battle-node", JSON.stringify(activeDraggedNode));
      }}
      onDragEnd={() => { activeDraggedNode = null; }}
      aria-label={`Drag ${label}`}
      title={`Drag ${label}`}
      className="grid h-7 w-7 shrink-0 cursor-grab grid-cols-2 place-content-center gap-0.5 rounded text-faint hover:bg-white/5 hover:text-foreground active:cursor-grabbing"
    >
      {Array.from({ length: 6 }, (_, index) => <span key={index} className="h-1 w-1 rounded-full bg-current" />)}
    </button>
  );
}

export function DropTarget({
  eventId,
  destination,
  label,
  moveAction,
  className = "",
  inline = false,
  children,
}: {
  eventId: string;
  destination: { groupId: string } | { side: "ATTACKER" | "DEFENDER" | null };
  label: string;
  moveAction: ServerAction;
  className?: string;
  inline?: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "valid" | "invalid">("idle");
  const canAccept = (node: DraggedNode | null) => {
    if (node === null) return false;
    if (!("groupId" in destination)) return true;
    return node.type !== "group"
      || (node.id !== destination.groupId && !node.descendantIds?.includes(destination.groupId));
  };

  const Target = inline ? "span" : "div";

  return (
    <Target
      onDragOver={(event) => {
        event.stopPropagation();
        const node = readDraggedNode(event);
        const valid = canAccept(node);
        if (node !== null) event.preventDefault();
        event.dataTransfer.dropEffect = valid ? "move" : "none";
        setState(node === null ? "idle" : valid ? "valid" : "invalid");
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setState("idle");
      }}
      onDrop={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const node = readDraggedNode(event);
        const valid = canAccept(node);
        setState(valid ? "idle" : "invalid");
        if (!node || !valid) return;
        const data = new FormData();
        data.set("eventId", eventId);
        data.set("nodeType", node.type);
        data.set("nodeId", node.id);
        data.set("destination", "groupId" in destination
          ? `group:${destination.groupId}`
          : `side:${destination.side ?? "UNSORTED"}`);
        await moveAction(data);
      }}
      role="group"
      aria-label={label}
      className={`min-w-0 rounded transition-colors ${className} ${state === "valid" ? "outline outline-2 outline-gold bg-gold/10" : state === "invalid" ? "outline outline-2 outline-type-red bg-type-red/10" : ""}`}
    >
      {children}
    </Target>
  );
}
