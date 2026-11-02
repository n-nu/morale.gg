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

export function DragSurface({
  type,
  id,
  descendantIds = [],
  label,
  className,
  children,
}: {
  type: DraggedNode["type"];
  id: string;
  descendantIds?: string[];
  label: string;
  className: string;
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(event) => {
        const target = event.target;
        const currentTarget = event.currentTarget;
        if (!(target instanceof Element)) return;
        const nestedNode = target.closest<HTMLElement>("[data-battle-node]");
        const interactive = target.closest("button, a, input, select, textarea, summary, [contenteditable='true'], [role='button']");
        if (interactive || (nestedNode && nestedNode !== currentTarget)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        activeDraggedNode = { type, id, descendantIds };
        setIsDragging(true);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-morale-battle-node", JSON.stringify(activeDraggedNode));
        event.stopPropagation();
      }}
      onDragEnd={() => {
        activeDraggedNode = null;
        setIsDragging(false);
      }}
      aria-label={`Draggable ${type === "group" ? "Command Group" : "Company"}: ${label}`}
      title={`Drag this ${type === "group" ? "Command Group" : "Company"} by its body; use its actions for a non-drag move`}
      data-battle-node="true"
      data-node-type={type}
      data-node-id={id}
      data-dragging={isDragging}
      className={`${className} cursor-grab transition-colors hover:border-edge-strong hover:bg-white/5 active:cursor-grabbing ${isDragging ? "border-gold/60 bg-gold/10 opacity-65" : ""}`}
    >
      {children}
    </div>
  );
}

export function DropTarget({
  eventId,
  destination,
  label,
  moveAction,
  className = "",
  children,
}: {
  eventId: string;
  destination: { groupId: string } | { side: "ATTACKER" | "DEFENDER" | null };
  label: string;
  moveAction: ServerAction;
  className?: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "valid" | "invalid">("idle");
  const canAccept = (node: DraggedNode | null) => {
    if (node === null) return false;
    if (!("groupId" in destination)) return true;
    return node.type !== "group"
      || (node.id !== destination.groupId && !node.descendantIds?.includes(destination.groupId));
  };

  return (
    <div
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
      aria-label={state === "invalid" ? `${label} — invalid destination` : label}
      data-drop-state={state}
      data-destination={"groupId" in destination ? `group:${destination.groupId}` : `side:${destination.side ?? "UNSORTED"}`}
      className={`min-w-0 rounded-2xl transition-colors ${className} ${state === "valid" ? "outline outline-2 outline-gold bg-gold/10 ring-2 ring-gold/20" : state === "invalid" ? "border-2 border-dashed border-type-red bg-type-red/5 ring-2 ring-type-red/20 cursor-not-allowed" : ""}`}
    >
      {children}
    </div>
  );
}
