"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type UnitRow = {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
};

// Build the index only when the server supplies a new list of units.
function buildHierarchy(units: UnitRow[]) {
  const ids = new Set(units.map((unit) => unit.id));
  const children = new Map<string, UnitRow[]>();
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

function getVisibleRows(
  roots: UnitRow[],
  children: Map<string, UnitRow[]>,
  expanded: Set<string>,
) {
  const visible: { unit: UnitRow; depth: number }[] = [];
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

export function UnitTable({ units }: { units: UnitRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { roots, children } = useMemo(() => buildHierarchy(units), [units]);
  const visible = getVisibleRows(roots, children, expanded);

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="units-table-toolbar">
        <p>Hierarchy</p>
        <div>
          <button
            type="button"
            onClick={() => setExpanded(new Set(children.keys()))}
          >
            Expand all
          </button>
          <button type="button" onClick={() => setExpanded(new Set())}>
            Collapse all
          </button>
        </div>
      </div>
      <div className="units-table-container">
        <table className="units-table">
          <caption className="sr-only">Unit hierarchy</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" className="units-table-secondary">
                Direct subunits
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ unit, depth }) => {
              const childCount = children.get(unit.id)?.length ?? 0;
              const isExpanded = expanded.has(unit.id);
              return (
                <tr key={unit.id} data-root={!unit.parent || undefined}>
                  <th scope="row">
                    <div
                      className="unit-tree-name"
                      style={{
                        paddingInlineStart: `calc(${depth} * var(--unit-indent))`,
                      }}
                    >
                      {childCount > 0 ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${unit.name}`}
                          onClick={() => toggle(unit.id)}
                        >
                          <span aria-hidden="true">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </button>
                      ) : (
                        <span className="unit-tree-leaf" aria-hidden="true">·</span>
                      )}
                      <Link href={`/units/${encodeURIComponent(unit.id)}`}>
                        {unit.name}
                      </Link>
                    </div>
                  </th>
                  <td className="units-table-secondary">
                    <span className="unit-count">{childCount || "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="units-table-summary">
        Showing {visible.length} of {units.length} units
      </p>
    </>
  );
}
