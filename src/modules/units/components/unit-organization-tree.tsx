"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import type { UnitDirectoryRow } from "../public-presentation";
import { UnitQuickFacts } from "./unit-quick-facts";

const MAX_DEFAULT_EXPANDED_CHILDREN = 10;

function UnitEmblem({ unit }: { unit: UnitDirectoryRow }) {
  return (
    <span className="unit-org-emblem" aria-hidden="true">
      {unit.imageRef ? (
        <Image src={unit.imageRef} alt="" width={42} height={42} unoptimized />
      ) : (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M24 4 41 10v12c0 11-7 18-17 22C14 40 7 33 7 22V10L24 4Z" />
          <path d="M24 12v23M15 20h18" />
        </svg>
      )}
    </span>
  );
}

export function UnitOrganizationTree({
  selected,
  units,
}: {
  selected: UnitDirectoryRow;
  units: UnitDirectoryRow[];
}) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const childrenById = new Map<string, UnitDirectoryRow[]>();
  for (const unit of units) {
    const parentId = unit.parent?.id;
    if (!parentId || !unitsById.has(parentId)) continue;
    const siblings = childrenById.get(parentId) ?? [];
    siblings.push(unit);
    childrenById.set(parentId, siblings);
  }
  for (const children of childrenById.values()) {
    children.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  }
  const [expanded, setExpanded] = useState(() =>
    (childrenById.get(selected.id)?.length ?? 0) <= MAX_DEFAULT_EXPANDED_CHILDREN
      ? new Set([selected.id])
      : new Set<string>(),
  );

  const toggle = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visited = new Set<string>();
  const renderUnit = (unit: UnitDirectoryRow, depth: number): ReactNode => {
    if (visited.has(unit.id)) return null;
    visited.add(unit.id);

    const children = childrenById.get(unit.id) ?? [];
    const isExpanded = expanded.has(unit.id);
    const isCurrent = unit.id === selected.id;
    return (
      <li
        key={unit.id}
        className="unit-org-item"
        data-depth={depth}
        data-density={depth === 0 ? "root" : depth === 1 ? "intermediate" : "compact"}
      >
        <article className={`unit-org-entry${isCurrent ? " is-current" : ""}`}>
          <Link
            href={`/units/${encodeURIComponent(unit.id)}`}
            className="unit-org-node-link"
            aria-current={isCurrent ? "page" : undefined}
            data-root={isCurrent ? "true" : undefined}
          >
            {isCurrent ? <span className="unit-org-current-label">Current Unit</span> : null}
            <span className="unit-org-node-heading">
              <UnitEmblem unit={unit} />
              <span className="unit-org-node-identity">
                <strong>{unit.name}</strong>
                <UnitQuickFacts unit={unit} variant="tree" showCounts={false} />
              </span>
            </span>
            <span className="unit-org-node-summary">
              {unit.memberCount ?? "—"} members · {children.length}{" "}
              {children.length === 1 ? "subunit" : "subunits"} · {unit.descendantCount}{" "}
              {unit.descendantCount === 1 ? "descendant" : "descendants"}
            </span>
          </Link>
          {children.length > 0 ? (
            <button
              type="button"
              className="unit-org-expand"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Hide" : "Show"} ${children.length} subunits of ${unit.name}`}
              onClick={() => toggle(unit.id)}
            >
              <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
              <span>{isExpanded ? "Hide" : "Show"} {children.length} subunits</span>
            </button>
          ) : null}
        </article>
        {isExpanded && children.length > 0 ? (
          <ul className="unit-org-children" aria-label={`${unit.name} subunits`}>
            {children.map((child) => renderUnit(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <section className="mt-8" aria-labelledby="organization-heading">
      <div className="units-section-title">
        <h2 id="organization-heading">Organization</h2>
        <span>{selected.name} · {selected.descendantCount + 1} Units in this subtree</span>
      </div>
      <div
        className="unit-org-scroll"
        role="region"
        aria-label="Organization family tree"
        tabIndex={0}
      >
        <ul className="unit-org-tree" aria-label={`${selected.name} hierarchy`}>
          {renderUnit(selected, 0)}
        </ul>
      </div>
    </section>
  );
}
