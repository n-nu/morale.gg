"use client";

import Image from "next/image";
import { useState } from "react";

import type { UnitDirectoryRow } from "../public-presentation";

export function UnitQuickFacts({
  unit,
  variant = "card",
  showCommander = true,
  showCounts = true,
}: {
  unit: UnitDirectoryRow;
  variant?: "card" | "tree" | "profile";
  showCommander?: boolean;
  showCounts?: boolean;
}) {
  const commanderName = unit.commander?.name?.trim() || null;
  const [commanderImageFailed, setCommanderImageFailed] = useState(false);

  return (
    <div className={`unit-quick-facts is-${variant}`}>
      {showCommander ? (
        <div className="unit-commander">
          {unit.commander?.image && !commanderImageFailed ? (
            <Image
              src={unit.commander.image}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="unit-commander-avatar"
              onError={() => setCommanderImageFailed(true)}
            />
          ) : (
            <span className="unit-commander-avatar is-fallback" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
              </svg>
            </span>
          )}
          <span className="unit-commander-copy">
            <span className="unit-quick-label">Commander</span>
            <strong>{commanderName ?? (unit.commander ? "Name unavailable" : "Unassigned")}</strong>
          </span>
        </div>
      ) : null}
      {showCounts ? (
        <dl className="unit-quick-counts">
          <div>
            <dt>Members</dt>
            <dd>{unit.memberCount ?? "—"}</dd>
          </div>
          <div>
            <dt>Descendants</dt>
            <dd>{unit.descendantCount}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
