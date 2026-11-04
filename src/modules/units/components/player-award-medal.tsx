"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";

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
  const isOpen = hovered || focused || expanded;

  return (
    <li
      data-open={isOpen}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="relative h-14 w-10 shrink-0 text-center transition-transform duration-500 ease-in-out data-[open=true]:z-20 [&:has(~li[data-open=true])]:-translate-x-7 [&[data-open=true]~li]:translate-x-7 motion-reduce:transition-none"
    >
      <button
        type="button"
        aria-label={`${award.name} medal details`}
        aria-expanded={isOpen}
        aria-controls={detailsId}
        onClick={() => setExpanded((open) => !open)}
        className="absolute left-1/2 top-1 flex h-12 w-12 -translate-x-1/2 items-center justify-center overflow-hidden bg-transparent text-muted transition-transform duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold data-[open=true]:scale-200 motion-reduce:transition-none"
        data-open={isOpen}
      >
        {award.imageRef ? (
          <Image
            src={award.imageRef}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-full w-full object-contain"
          />
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
