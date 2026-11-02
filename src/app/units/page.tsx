import { UnitTable } from "@/modules/units/components/unit-table";
import { listPublicUnitDirectory } from "@/modules/units/server/queries";
import { Breadcrumbs, PageEmptyState, PageHeader } from "@/app/presentation";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await listPublicUnitDirectory();

  return (
    <>
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Units" }]} />
      <PageHeader
        category="Organization"
        title="Units"
        count={units.length}
        description="Explore public Units by commander, active roster, and hierarchy."
      />
      {units.length === 0 ? (
        <PageEmptyState title="No units are available yet." />
      ) : (
        <UnitTable units={units} />
      )}
    </>
  );
}
