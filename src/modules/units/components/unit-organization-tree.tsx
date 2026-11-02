"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import type { UnitDirectoryRow } from "../public-presentation";
import { UnitQuickFacts } from "./unit-quick-facts";

const NODE_WIDTH = 184;
const SIBLING_GAP = 18;
const LEVEL_HEIGHT = 184;
const NODE_HEIGHT = 88;

type PositionedUnit = {
  unit: UnitDirectoryRow;
  x: number;
  y: number;
  level: number;
  children: PositionedUnit[];
};

function UnitEmblem({ unit }: { unit: UnitDirectoryRow }) {
  return (
    <span className="unit-org-emblem" aria-hidden="true">
      {unit.imageRef ? (
        <Image src={unit.imageRef} alt="" width={36} height={36} unoptimized />
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
  const markerId = `unit-tree-arrow-${useId().replaceAll(":", "")}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const childrenById = new Map<string, UnitDirectoryRow[]>();
  for (const unit of units) {
    const parentId = unit.parent?.id;
    if (!parentId || !unitsById.has(parentId)) continue;
    const siblings = childrenById.get(parentId) ?? [];
    siblings.push(unit);
    childrenById.set(parentId, siblings);
  }

  let hierarchyRoot = selected;
  const ancestorIds = new Set([selected.id]);
  while (hierarchyRoot.parent && !ancestorIds.has(hierarchyRoot.parent.id)) {
    const parent = unitsById.get(hierarchyRoot.parent.id);
    if (!parent) break;
    ancestorIds.add(parent.id);
    hierarchyRoot = parent;
  }

  const subtreeWidth = (unitId: string, ancestors = new Set<string>()): number => {
    if (ancestors.has(unitId)) return NODE_WIDTH;
    const descendants = childrenById.get(unitId) ?? [];
    if (descendants.length === 0) return NODE_WIDTH;
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(unitId);
    return descendants.reduce(
      (total, child) => total + subtreeWidth(child.id, nextAncestors),
      0,
    ) + SIBLING_GAP * (descendants.length - 1);
  };

  const treeWidth = Math.max(900, subtreeWidth(hierarchyRoot.id));
  const placedIds = new Set<string>();
  const positionNode = (
    unit: UnitDirectoryRow,
    x: number,
    level: number,
  ): PositionedUnit | null => {
    if (placedIds.has(unit.id)) return null;
    placedIds.add(unit.id);
    const descendants = childrenById.get(unit.id) ?? [];
    const width = descendants.reduce(
      (total, child) => total + subtreeWidth(child.id),
      0,
    ) + SIBLING_GAP * Math.max(0, descendants.length - 1);
    let cursor = x - width / 2;
    const positionedChildren: PositionedUnit[] = [];

    for (const child of descendants) {
      const childWidth = subtreeWidth(child.id);
      const childX = cursor + childWidth / 2;
      const positioned = positionNode(child, childX, level + 1);
      if (positioned) positionedChildren.push(positioned);
      cursor += childWidth + SIBLING_GAP;
    }

    return {
      unit,
      x,
      y: level * LEVEL_HEIGHT,
      level,
      children: positionedChildren,
    };
  };

  const root = positionNode(hierarchyRoot, treeWidth / 2, 0);
  const positionedUnits: PositionedUnit[] = [];
  const edges: Array<{ from: PositionedUnit; to: PositionedUnit }> = [];
  let depth = 0;
  const collect = (node: PositionedUnit) => {
    positionedUnits.push(node);
    depth = Math.max(depth, node.level);
    for (const child of node.children) {
      edges.push({ from: node, to: child });
      collect(child);
    }
  };
  if (root) collect(root);
  const treeHeight = (depth + 1) * LEVEL_HEIGHT;

  useEffect(() => {
    const scrollRegion = scrollRef.current;
    const rootNode = scrollRegion?.querySelector<HTMLElement>(".unit-org-node-link[data-root='true']");
    if (!scrollRegion || !rootNode) return;
    scrollRegion.scrollLeft = rootNode.offsetLeft - scrollRegion.clientWidth / 2;
  }, [selected.id, treeWidth]);

  return (
    <section className="mt-8" aria-labelledby="organization-heading">
      <div className="units-section-title">
        <h2 id="organization-heading">Organization</h2>
        <span>{hierarchyRoot.name} · {hierarchyRoot.descendantCount + 1} Units</span>
      </div>
      <div
        className="unit-org-scroll"
        ref={scrollRef}
        role="region"
        aria-label="Organization family tree"
        tabIndex={0}
      >
        <div
          className="unit-org-tree-canvas"
          role="tree"
          style={{ width: treeWidth, height: treeHeight }}
        >
          <svg
            className="unit-org-connectors"
            width={treeWidth}
            height={treeHeight}
            aria-hidden="true"
          >
            <defs>
              <marker
                id={markerId}
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="6"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M1 1 4 6 7 1" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </marker>
            </defs>
            {edges.map(({ from, to }) => {
              const midY = from.y + LEVEL_HEIGHT / 2;
              return (
                <path
                  key={`${from.unit.id}-${to.unit.id}`}
                  d={`M ${from.x} ${from.y + NODE_HEIGHT} V ${midY} H ${to.x} V ${to.y - 5}`}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}
          </svg>
          {positionedUnits.map(({ unit, x, y, level }) => (
            <Link
              key={unit.id}
              href={`/units/${encodeURIComponent(unit.id)}`}
              className="unit-org-node-link"
              role="treeitem"
              aria-level={level + 1}
              aria-current={unit.id === selected.id ? "page" : undefined}
              aria-label={`${unit.name}, commander ${unit.commander?.name?.trim() || "unassigned"}`}
              data-root={unit.id === hierarchyRoot.id || undefined}
              style={{ left: x, top: y, width: NODE_WIDTH }}
            >
              <span className="unit-org-node-heading">
                <UnitEmblem unit={unit} />
                <span className="unit-org-node-identity">
                  <strong>{unit.name}</strong>
                  <UnitQuickFacts unit={unit} variant="tree" showCounts={false} />
                </span>
              </span>
              <span className="unit-org-reveal">
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
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
