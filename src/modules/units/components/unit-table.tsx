"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { UnitDirectoryRow } from "../public-presentation";
import { UnitQuickFacts } from "./unit-quick-facts";

export type UnitRow = {
  id: string;
  name: string;
  imageRef: string | null;
  parent: { id: string; name: string } | null;
};

// Build the index only when the server supplies a new list of units.
export function buildHierarchy<T extends UnitRow>(units: T[]) {
  const ids = new Set(units.map((unit) => unit.id));
  const children = new Map<string, T[]>();
  for (const unit of units) {
    if (unit.parent && ids.has(unit.parent.id)) {
      const siblings = children.get(unit.parent.id) ?? [];
      siblings.push(unit);
      children.set(unit.parent.id, siblings);
    }
  }
  const roots = units.filter((unit) => !unit.parent || !ids.has(unit.parent.id));
  return { roots, children };
}

export function getVisibleRows<T extends UnitRow>(
  roots: T[],
  children: Map<string, T[]>,
  expanded: Set<string>,
) {
  const visible: { unit: T; depth: number }[] = [];
  const visited = new Set<string>();
  const stack = roots.map((unit) => ({ unit, depth: 0 })).reverse();
  // Iteration avoids call-stack limits; visited IDs prevent cyclic traversal.
  while (stack.length) {
    const row = stack.pop()!;
    if (visited.has(row.unit.id)) continue;
    visited.add(row.unit.id);
    visible.push(row);
    if (expanded.has(row.unit.id)) {
      for (const child of [...(children.get(row.unit.id) ?? [])].reverse()) {
        stack.push({ unit: child, depth: row.depth + 1 });
      }
    }
  }
  return visible;
}

function UnitMark({ unit }: { unit: UnitDirectoryRow }) {
  return (
    <span className="unit-directory-mark" aria-hidden="true">
      {unit.imageRef ? (
        <Image src={unit.imageRef} alt="" width={68} height={68} unoptimized />
      ) : (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M24 4 41 10v12c0 11-7 18-17 22C14 40 7 33 7 22V10L24 4Z" />
          <path d="M24 12v23M15 20h18" />
        </svg>
      )}
    </span>
  );
}

export function UnitTable({
  units,
}: { units: UnitDirectoryRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { roots, children } = useMemo(() => buildHierarchy(units), [units]);
  const visibleCount = getVisibleRows(roots, children, expanded).length;
  const visited = new Set<string>();

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderUnit(unit: UnitDirectoryRow, depth: number): ReactNode {
    if (visited.has(unit.id)) return null;
    visited.add(unit.id);

    const subunits = children.get(unit.id) ?? [];
    const isExpanded = expanded.has(unit.id);
    return (
      <li key={unit.id} className="unit-directory-node" data-depth={depth}>
        <article className="unit-directory-entry">
          <Link
            href={`/units/${encodeURIComponent(unit.id)}`}
            className="unit-directory-card"
          >
            <div className="unit-directory-visual">
              {unit.imageRef ? (
                <Image
                  src={unit.imageRef}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 700px) calc(100vw - 56px), 540px"
                  className="unit-directory-background"
                />
              ) : null}
              <div className="unit-directory-visual-shade" />
              <div className="unit-directory-visual-content">
                <UnitMark unit={unit} />
                <div className="unit-directory-title">
                  <h2>{unit.name}</h2>
                  <UnitQuickFacts
                    unit={unit}
                    variant="card"
                    showCounts={false}
                  />
                </div>
              </div>
            </div>
            <div className="unit-directory-reveal">
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
              {unit.description ? (
                <p className="unit-directory-description">{unit.description}</p>
              ) : null}
            </div>
          </Link>
          {subunits.length > 0 ? (
            <button
              type="button"
              className="unit-directory-expand"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${unit.name} subunits`}
              onClick={() => toggle(unit.id)}
            >
              <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
            </button>
          ) : null}
        </article>
        {isExpanded && subunits.length > 0 ? (
          <ul className="unit-directory-children">
            {subunits.map((child) => renderUnit(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="unit-directory" aria-label="Unit hierarchy directory">
      <div className="units-table-toolbar">
        <p>Explore the hierarchy</p>
        <div>
          <button
            type="button"
            aria-label="Expand all units"
            onClick={() => setExpanded(new Set(children.keys()))}
          >
            Expand all
          </button>
          <button type="button" aria-label="Collapse all units" onClick={() => setExpanded(new Set())}>
            Collapse all
          </button>
        </div>
      </div>
      <ul className="unit-directory-roots">
        {roots.map((unit) => renderUnit(unit, 0))}
      </ul>
      <p className="units-table-summary">
        Showing {visibleCount} of {units.length} units
      </p>
    </section>
  );
}
