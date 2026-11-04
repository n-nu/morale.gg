"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getTopLevelUnitDirectoryEntries,
  type UnitDirectoryRow,
} from "../public-presentation";
import { UnitQuickFacts } from "./unit-quick-facts";

export type UnitRow = {
  id: string;
  name: string;
  imageRef: string | null;
  parent: { id: string; name: string } | null;
};

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

export function UnitTable({ units }: { units: UnitDirectoryRow[] }) {
  const { children } = buildHierarchy(units);
  const roots = getTopLevelUnitDirectoryEntries(units);

  return (
    <section className="unit-directory" aria-label="Top-level Unit directory">
      <ul className="unit-directory-roots">
        {roots.map((unit) => {
          const subunitCount = children.get(unit.id)?.length ?? 0;
          return (
            <li key={unit.id} className="unit-directory-node">
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
                      <span className="unit-directory-subunit-count">
                        {subunitCount} {subunitCount === 1 ? "subunit" : "subunits"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="unit-directory-reveal">
                  <dl className="unit-quick-counts unit-directory-counts">
                    <div>
                      <dt>Members</dt>
                      <dd>{unit.memberCount ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Subunits</dt>
                      <dd>{subunitCount}</dd>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
