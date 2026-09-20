import { UnitTable } from "@/modules/units/components/unit-table";
import { listUnits } from "@/modules/units/server/queries";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await listUnits();

  return (
    <>
      <div className="units-hero">
        <div className="units-eyebrow">Directory</div>
        <h1>Units<span className="units-total">{units.length}</span></h1>
        <p>Explore the hierarchy. From the whole organization to the smallest unit.</p>
      </div>
      {units.length === 0 ? (
        <p className="units-empty">No units are available yet.</p>
      ) : (
        <UnitTable units={units} />
      )}
    </>
  );
}
