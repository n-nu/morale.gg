"use client";

import Image from "next/image";
import { useState } from "react";

import {
  playerIdDescription,
  playerIdentityLabel,
  safeRobloxAvatarUrl,
  type PlayerIdentityPresentation,
} from "../identity";

export function PlayerIdentity({
  identity,
  size = 32,
  showPlayerId = false,
  layout = "inline",
}: {
  identity: PlayerIdentityPresentation;
  size?: number;
  showPlayerId?: boolean;
  layout?: "inline" | "stacked";
}) {
  const avatarUrl = safeRobloxAvatarUrl(identity.robloxAvatarUrl);
  const username = identity.robloxUsername?.trim() || null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span className={layout === "stacked"
      ? "inline-flex min-w-0 flex-col items-center gap-3 text-center"
      : "inline-flex min-w-0 items-center gap-2"}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge-strong bg-surface-2 text-muted"
        style={{ width: size, height: size }}
      >
        {avatarUrl && failedUrl !== avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={username ? `Roblox avatar for @${username}` : `Roblox avatar for Player ID ${identity.playerId}`}
            width={size}
            height={size}
            sizes={`${size}px`}
            loading="lazy"
            unoptimized
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-label="Player avatar unavailable"
            role="img"
            className="h-4/5 w-4/5"
          >
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
          </svg>
        )}
      </span>
      <span className={layout === "stacked" ? "min-w-0 max-w-full" : "min-w-0"}>
        <span className={layout === "stacked" ? "block break-words text-sm font-medium text-muted" : "block truncate"}>
          {playerIdentityLabel(identity)}
        </span>
        {showPlayerId && username ? (
          <span className={layout === "stacked"
            ? "mt-1 block break-all font-mono text-xs text-muted"
            : "block break-all font-mono text-[11px] text-muted"}
          >
            {playerIdDescription(identity.playerId)}
          </span>
        ) : null}
      </span>
    </span>
  );
}
