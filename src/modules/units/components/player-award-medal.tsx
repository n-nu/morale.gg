"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const CLICK_ANIMATION_MS = 900;

const DEPTH_LAYERS = [
  "player-award-medal__depth player-award-medal__depth--1",
  "player-award-medal__depth player-award-medal__depth--2",
  "player-award-medal__depth player-award-medal__depth--3",
  "player-award-medal__depth player-award-medal__depth--4",
] as const;

type PlayerAwardMedalProps = {
  award: {
    name: string;
    description: string | null;
    imageRef: string | null;
  };
  children?: ReactNode;
};

export function PlayerAwardMedal({ award, children }: PlayerAwardMedalProps) {
  const detailsId = `player-award-details-${useId()}`;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const pointerType = useRef<string | null>(null);
  const returnTimer = useRef<number | null>(null);
  const clickTimer = useRef<number | null>(null);
  const clickStartFrame = useRef<number | null>(null);
  const isOpen = hovered || focused || expanded;
  const isDimensional = hovered || focused || pressed;
  const imageRef = award.imageRef;

  useEffect(
    () => () => {
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if (clickStartFrame.current !== null) window.cancelAnimationFrame(clickStartFrame.current);
      clickStartFrame.current = null;
      if (returnTimer.current !== null) window.clearTimeout(returnTimer.current);
    },
    [],
  );

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.detail > 0 && suppressClick.current) return;
    if (event.detail === 0 || pointerType.current === "touch") {
      setExpanded((open) => !open);
    }
    if (!imageRef || !hovered) return;

    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    if (clickStartFrame.current !== null) window.cancelAnimationFrame(clickStartFrame.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClicking(false);
      return;
    }

    setClicking(false);
    clickStartFrame.current = window.requestAnimationFrame(() => {
      setClicking(true);
      clickStartFrame.current = null;
      clickTimer.current = window.setTimeout(() => {
        setClicking(false);
        clickTimer.current = null;
      }, CLICK_ANIMATION_MS);
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    pointerType.current = event.pointerType;
    if (event.pointerType !== "touch") {
      setFocused(false);
      setExpanded(false);
    }
    suppressClick.current = false;
    setPressed(true);
    if (!imageRef || event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    if (clickStartFrame.current !== null) window.cancelAnimationFrame(clickStartFrame.current);
    if (returnTimer.current !== null) window.clearTimeout(returnTimer.current);
    setClicking(false);
    setSettling(false);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const x = event.clientX - active.x;
    const y = event.clientY - active.y;
    if (!active.moved && Math.hypot(x, y) < 3) return;
    if (!active.moved) setDragging(true);
    active.moved = true;
    suppressClick.current = true;
    event.currentTarget.style.setProperty("--medal-drag-x", `${Math.max(-12, Math.min(12, -y * 0.4))}deg`);
    event.currentTarget.style.setProperty("--medal-drag-y", `${Math.max(-15, Math.min(15, x * 0.5))}deg`);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (active && active.pointerId !== event.pointerId) return;
    setPressed(false);
    if (!active) return;
    drag.current = null;
    setDragging(false);
    const bounds = event.currentTarget.getBoundingClientRect();
    setHovered(event.clientX >= bounds.left && event.clientX <= bounds.right &&
      event.clientY >= bounds.top && event.clientY <= bounds.bottom);
    if (active.moved) {
      setSettling(true);
      returnTimer.current = window.setTimeout(() => {
        setSettling(false);
        returnTimer.current = null;
      }, 400);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <li
      data-open={isOpen}
      data-hovered={hovered}
      data-focused={focused}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => setFocused(event.target.matches(":focus-visible"))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="player-award-medal relative h-14 w-10 shrink-0 text-center transition-transform duration-500 ease-in-out data-[open=true]:z-20 [&:has(~li[data-open=true])]:-translate-x-7 [&[data-open=true]~li]:translate-x-7 motion-reduce:transition-none"
    >
      <button
        type="button"
        aria-label={`${award.name} medal details`}
        aria-expanded={isOpen}
        aria-controls={detailsId}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onPointerLeave={() => { if (!drag.current) setPressed(false); }}
        onDragStart={(event) => event.preventDefault()}
        className="player-award-medal__button absolute left-1/2 top-1 flex h-12 w-12 -translate-x-1/2 items-center justify-center bg-transparent text-muted transition-transform duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold data-[open=true]:scale-200 motion-reduce:transition-none"
        data-open={isOpen}
        data-dimensional={isDimensional}
        data-focused={focused}
        data-hovered={hovered}
        data-clicking={clicking}
        data-pressed={pressed}
        data-dragging={dragging}
        data-settling={settling}
      >
        {imageRef ? (
          <span className="player-award-medal__art" aria-hidden="true">
            {DEPTH_LAYERS.map((className) => (
              <Image
                key={className}
                src={imageRef}
                alt=""
                width={48}
                height={48}
                unoptimized
                className={`${className} absolute inset-0 h-full w-full object-contain`}
              />
            ))}
            <Image
              src={imageRef}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="player-award-medal__face absolute inset-0 h-full w-full object-contain"
            />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center border border-edge bg-surface-2 text-xs"
          >
            —
          </span>
        )}
      </button>
      <div
        id={detailsId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`absolute left-1/2 top-18 grid w-40 -translate-x-1/2 bg-transparent transition-all duration-500 ease-in-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-2">
            <h3 className="break-words text-xs font-bold leading-snug text-foreground">{award.name}</h3>
            {award.description ? (
              <p className="mt-1 break-words text-[11px] leading-relaxed text-muted">{award.description}</p>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </li>
  );
}
