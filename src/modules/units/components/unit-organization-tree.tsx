import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { UnitRow } from "./unit-table";

type UnitIdentity = Pick<UnitRow, "id" | "name" | "imageRef">;

export function UnitOrganizationTree({
  selected,
  units,
}: {
  selected: UnitIdentity;
  units: UnitRow[];
}) {
  const children = new Map<string, UnitRow[]>();
  for (const unit of units) {
    const parentId = unit.parent?.id;
    if (!parentId) continue;
    const siblings = children.get(parentId) ?? [];
    siblings.push(unit);
    children.set(parentId, siblings);
  }

  const visited = new Set([selected.id]);
  const renderBranches = (parentId: string): ReactNode => {
    const descendants = children.get(parentId) ?? [];
    if (descendants.length === 0) return null;

    return (
      <ul className="unit-org-children">
        {descendants.map((unit) => {
          if (visited.has(unit.id)) return null;
          visited.add(unit.id);
          const childCount = children.get(unit.id)?.length ?? 0;
          return (
            <li key={unit.id} className="unit-org-branch">
              <div className="unit-org-node">
                {unit.imageRef ? <Image src={unit.imageRef} alt="" width={24} height={20} unoptimized className="h-5 w-6 shrink-0 object-contain" /> : null}
                <Link href={`/units/${encodeURIComponent(unit.id)}`} className="unit-org-link">{unit.name}</Link>
                <span className="unit-org-count">{childCount} direct</span>
              </div>
              {renderBranches(unit.id)}
            </li>
          );
        })}
      </ul>
    );
  };

  const childCount = children.get(selected.id)?.length ?? 0;

  return (
    <section className="mt-8" aria-labelledby="organization-heading">
      <div className="units-section-title">
        <h2 id="organization-heading">Organization</h2>
        <span>{childCount} direct subunits</span>
      </div>
      {childCount === 0 ? (
        <p className="units-empty">This Unit has no descendants.</p>
      ) : (
        <div className="unit-org-tree">
          <div className="unit-org-selected">
            {selected.imageRef ? <Image src={selected.imageRef} alt="" width={32} height={26} unoptimized className="h-[26px] w-8 shrink-0 object-contain" /> : null}
            <span className="unit-org-selected-name">{selected.name}</span>
            <span className="unit-org-count">Selected Unit</span>
          </div>
          {renderBranches(selected.id)}
        </div>
      )}
    </section>
  );
}
