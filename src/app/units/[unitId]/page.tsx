import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit } from "@/modules/units/server/queries";
import { UnitLinks } from "@/modules/units/components/unit-links";
import { isUnitsDemoMode } from "@/modules/units/server/demo";
import { RosterSection } from "@/modules/players/server/roster-section";

export const dynamic = "force-dynamic";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) notFound();

  return (
    <>
      <Link href="/units" className="units-back">
        ← All units
      </Link>
      <div className="units-hero">
        <div className="units-eyebrow">
          {unit.parent ? "Linked unit" : "Root unit"}
        </div>
        <h1>{unit.name}</h1>
        <p>
          {unit.parent
            ? `Part of ${unit.parent.name}. Follow the connections below to explore this formation.`
            : "Where this organization begins. Explore the units connected below."}
        </p>
        <div className="units-stats">
          <span><strong>{unit.children.length}</strong>Child units</span>
        </div>
      </div>
      <section aria-labelledby="parent-heading" className="mt-8">
        <div className="units-section-title">
          <h2 id="parent-heading">Parent unit</h2>
          <span>One level up</span>
        </div>
        {unit.parent ? (
          <UnitLinks units={[unit.parent]} />
        ) : (
          <p className="units-empty">This is a root unit. It has no parent.</p>
        )}
      </section>
      <section aria-labelledby="children-heading" className="mt-8">
        <div className="units-section-title">
          <h2 id="children-heading">Child units</h2>
          <span>Continue exploring</span>
        </div>
        {unit.children.length > 0 ? (
          <UnitLinks units={unit.children} />
        ) : (
          <p className="units-empty">This unit has no child units.</p>
        )}
      </section>
      {isUnitsDemoMode() ? <p className="units-empty mt-8">Rosters are available for persisted Units. Sample units have no roster.</p> : <RosterSection unitId={unitId} />}
    </>
  );
}
